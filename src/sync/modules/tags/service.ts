import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { TagSchema } from './schemas/tag';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/state';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';
import { Tag } from './entities/tag';
import { TagsState } from './entities/state';
import { plainToClass } from 'class-transformer';

@Injectable()
export class TagsSyncService {
    private readonly logger = new Logger(TagsSyncService.name);

    constructor(
        @InjectModel(TagSchema)
        private readonly tagModel: ReturnModelType<typeof TagSchema>,
    ) {}

    async saveNewTags(tags: Tag[], user: User, stage: Stage) {
        await this.tagModel.create(
            tags.map((folder) => ({
                ...folder,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                commit: stage.commit,
            })),
        );
    }

    async updateTags(tags: Tag[], user: User, stage: Stage) {
        await Promise.all(
            tags.map((folder) =>
                this.tagModel.update({ id: folder.id, userId: user.id }, [
                    {
                        $set: {
                            ...folder,
                            userId: user.id,
                            commit: stage.commit,
                            lastAction: {
                                $cond: {
                                    if: { $gt: [folder.updateDate, '$updateDate'] },
                                    then: STATE_ACTION.update,
                                    else: '$lastAction',
                                },
                            },
                        },
                    },
                ]),
            ),
        );
    }

    async deleteTags(tags: DeleteEntity[], user: User, stage: Stage) {
        await Promise.all(
            tags.map((folder) =>
                this.tagModel.update({ id: folder.id, userId: user.id }, [
                    {
                        $set: {
                            ...folder,
                            userId: user.id,
                            commit: stage.commit,
                            lastAction: {
                                $cond: {
                                    if: { $gt: [folder.updateDate, '$updateDate'] },
                                    then: STATE_ACTION.delete,
                                    else: '$lastAction',
                                },
                            },
                        },
                    },
                ]),
            ),
        );
    }

    async pushState(stage: Stage, state: TagsState, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push tags state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        if (state.create.length !== 0) {
            this.logger.log(`Create tags in state for user id:${user.id} from device id:${device.id}...`);
            await this.saveNewTags(state.create, user, stage);
        } else {
            this.logger.log(`Nothing for create tags in state for user id:${user.id} from device id:${device.id}...`);
        }

        if (state.update.length !== 0) {
            this.logger.log(`Update tags in state for user id:${user.id} from device id:${device.id}...`);
            await this.updateTags(state.update, user, stage);
        } else {
            this.logger.log(`Nothing for update tags in state for user id:${user.id} from device id:${device.id}...`);
        }

        if (state.delete.length !== 0) {
            this.logger.log(`Delete tags in state for user id:${user.id} from device id:${device.id}...`);
            await this.deleteTags(state.delete, user, stage);
        } else {
            this.logger.log(`Nothing for delete tags in state for user id:${user.id} from device id:${device.id}...`);
        }

        this.logger.log(
            `Finish push tags state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );
    }

    async pullState(commit: Commit, user: User, device: Device): Promise<TagsState> {
        this.logger.log(`Pull tags state for user id:${user.id} from device id:${device.id}`);

        let query;

        if (commit) {
            query = {
                userId: user.id,
                commit: { $gt: commit.head },
            };
        } else {
            query = {
                userId: user.id,
            };
        }

        const createTags = await this.tagModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateTags = await this.tagModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        const deletedTags = await this.tagModel
            .find({
                ...query,
                lastAction: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createTags.map((folder) => plainToClass(Tag, folder, { excludeExtraneousValues: true })),
            update: updateTags.map((folder) => plainToClass(Tag, folder, { excludeExtraneousValues: true })),
            delete: deletedTags.map((folder) => plainToClass(DeleteEntity, folder, { excludeExtraneousValues: true })),
        };
    }
}
