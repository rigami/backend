import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { FolderSchema } from './schemas/folder';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/state';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';
import { Folder } from '@/sync/modules/folders/entities/folder';
import { FoldersState } from '@/sync/modules/folders/entities/state';
import { plainToClass } from 'class-transformer';

@Injectable()
export class FoldersSyncService {
    private readonly logger = new Logger(FoldersSyncService.name);

    constructor(
        @InjectModel(FolderSchema)
        private readonly folderModel: ReturnModelType<typeof FolderSchema>,
    ) {}

    async saveNewFolders(folders: Folder[], user: User, stage: Stage) {
        await this.folderModel.create(
            folders.map((folder) => ({
                ...folder,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                commit: stage.commit,
            })),
        );
    }

    async updateFolders(folders: Folder[], user: User, stage: Stage) {
        await Promise.all(
            folders.map((folder) =>
                this.folderModel.update({ id: folder.id, userId: user.id }, [
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

    async deleteFolders(folders: DeleteEntity[], user: User, stage: Stage) {
        await Promise.all(
            folders.map((folder) =>
                this.folderModel.update({ id: folder.id, userId: user.id }, [
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

    async pushState(stage: Stage, state: FoldersState, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push folders state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        if (state.create.length !== 0) {
            this.logger.log(`Create folders in state for user id:${user.id} from device id:${device.id}...`);
            await this.saveNewFolders(state.create, user, stage);
        } else {
            this.logger.log(
                `Nothing for create folders in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.update.length !== 0) {
            this.logger.log(`Update folders in state for user id:${user.id} from device id:${device.id}...`);
            await this.updateFolders(state.update, user, stage);
        } else {
            this.logger.log(
                `Nothing for update folders in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.delete.length !== 0) {
            this.logger.log(`Delete folders in state for user id:${user.id} from device id:${device.id}...`);
            await this.deleteFolders(state.delete, user, stage);
        } else {
            this.logger.log(
                `Nothing for delete folders in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        this.logger.log(
            `Finish push folders state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );
    }

    async pullState(commit: Commit, user: User, device: Device): Promise<FoldersState> {
        this.logger.log(`Pull folders state for user id:${user.id} from device id:${device.id}`);

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

        const createFolders = await this.folderModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateFolders = await this.folderModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        const deletedFolders = await this.folderModel
            .find({
                ...query,
                lastAction: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createFolders.map((folder) => plainToClass(Folder, folder, { excludeExtraneousValues: true })),
            update: updateFolders.map((folder) => plainToClass(Folder, folder, { excludeExtraneousValues: true })),
            delete: deletedFolders.map((folder) =>
                plainToClass(DeleteEntity, folder, { excludeExtraneousValues: true }),
            ),
        };
    }
}
