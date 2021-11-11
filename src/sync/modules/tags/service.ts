import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { TagSchema } from './schemas/tag';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/delete';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Tag } from './entities/tag';
// import { TagsState } from './entities/tagPush';
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
                createCommit: stage.commit,
                updateCommit: stage.commit,
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
                            updateCommit: stage.commit,
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
        /* await Promise.all(
            tags.map((folder) =>
                this.tagModel.update({ id: folder.id, userId: user.id }, [
                    {
                        $set: {
                            ...folder,
                            userId: user.id,
                            updateCommit: stage.commit,
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
        ); */
    }

    /* async pushState(stage: Stage, localCommit: Commit, state: TagsState, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push tags state for user.id:${user.id} device.id:${device.id}
            Summary:
            Create: ${state.create.length}
            Update: ${state.update.length}
            Delete: ${state.delete.length}`,
        );

        if (state.create.length !== 0) {
            await this.saveNewTags(state.create, user, stage);
        }

        if (state.update.length !== 0) {
            await this.updateTags(state.update, user, stage);
        }

        if (state.delete.length !== 0) {
            await this.deleteTags(state.delete, user, stage);
        }
    }

    async pullState(fromCommit: Commit, toCommit: Commit, user: User, device: Device): Promise<TagsState> {
        this.logger.log(`Pull tags state for user.id:${user.id} device.id:${device.id}`);

        let query;

        if (fromCommit) {
            query = {
                userId: user.id,
                updateCommit: { $gt: fromCommit.head },
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
    } */
}
