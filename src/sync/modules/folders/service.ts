import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { FolderSchema } from './schemas/folder';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Folder, FolderSnapshot } from '@/sync/modules/folders/entities/folder';
import { plainToClass } from 'class-transformer';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { merge, omitBy } from 'lodash';

@Injectable()
export class FoldersSyncService {
    private readonly logger = new Logger(FoldersSyncService.name);

    constructor(
        @InjectModel(FolderSchema)
        private readonly folderModel: ReturnModelType<typeof FolderSchema>,
        @InjectModel(HistorySchema)
        private readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {}

    async merge(folders, processFolder) {
        let syncedFoldersQueue = [...folders];
        let pairFoldersIds = {};

        while (syncedFoldersQueue.length !== 0) {
            const pairFoldersLevelIds = {};

            const rootFolders = syncedFoldersQueue.filter((entity) => {
                if (entity.payload.parentId || entity.payload.parentTempId in pairFoldersIds) {
                    pairFoldersLevelIds[entity.tempId || entity.id] = null;

                    return true;
                }

                return false;
            });

            syncedFoldersQueue = syncedFoldersQueue.filter(
                (entity) => !((entity.tempId || entity.id) in pairFoldersLevelIds),
            );
            pairFoldersIds = merge(pairFoldersIds, pairFoldersLevelIds);

            for (const entity of rootFolders) {
                const pair = await processFolder({
                    ...entity,
                    payload: {
                        ...entity.payload,
                        parentId: entity.payload.parentId || pairFoldersIds[entity.payload.parentTempId],
                    },
                });

                pairFoldersIds[pair.localId] = pair.cloudId;
            }
        }

        return pairFoldersIds;
    }

    async exist(searchFolder: Folder, user: User): Promise<FolderSnapshot> {
        let folder;

        if (searchFolder.id) {
            folder = await this.folderModel.findOne({
                id: searchFolder.id,
                userId: user.id,
            });
        }

        if (!folder) {
            folder = await this.folderModel.findOne({
                parentId: searchFolder.parentId,
                name: searchFolder.name,
                userId: user.id,
            });
        }

        return folder && plainToClass(FolderSnapshot, folder, { excludeExtraneousValues: true });
    }

    async create(folder: FolderSnapshot, user: User, stage: Stage) {
        return await this.folderModel.create({
            ...folder,
            lastAction: STATE_ACTION.create,
            userId: user.id,
            createCommit: stage.commit,
            updateCommit: stage.commit,
        });
    }

    async update(folder: FolderSnapshot, user: User, stage: Stage) {
        await this.folderModel.updateOne(
            {
                id: folder.id,
                userId: user.id,
            },
            {
                $set: {
                    ...folder,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    createCommit: stage.commit,
                    updateCommit: stage.commit,
                },
            },
        );

        return this.folderModel.findOne({ id: folder.id, userId: user.id });
    }

    async delete(deleteEntity: DeletePairEntity, user: User, stage: Stage) {
        await this.folderModel.deleteOne({
            id: deleteEntity.id,
            userId: user.id,
        });
        await this.historyModel.create({
            userId: user.id,
            action: HISTORY_ACTION.delete,
            entityType: 'folder',
            entityId: deleteEntity.id,
            date: deleteEntity.deleteDate,
            commit: stage.commit,
        });
    }

    async get(fromCommit: Commit, toCommit: Commit, user: User, device: Device) {
        const query = {
            userId: user.id,
            updateCommit: omitBy({ $gt: fromCommit?.head, $lte: toCommit?.head }, (date) => !date),
        };

        console.log('query:', query);

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

        if (!fromCommit) {
            return {
                create: [...createFolders, ...updateFolders].map((folder) =>
                    plainToClass(
                        FolderSnapshot,
                        { ...folder, lastAction: STATE_ACTION.create },
                        { excludeExtraneousValues: true },
                    ),
                ),
                update: [],
                delete: [],
            };
        }

        const deletedFolders = await this.historyModel
            .find({
                userId: user.id,
                commit: query.updateCommit,
                entityType: 'folder',
                action: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        console.log('deletedFolders:', deletedFolders)

        return {
            create: createFolders.map((folder) =>
                plainToClass(FolderSnapshot, folder, { excludeExtraneousValues: true }),
            ),
            update: updateFolders.map((folder) =>
                plainToClass(FolderSnapshot, folder, { excludeExtraneousValues: true }),
            ),
            delete: deletedFolders.map((deletedEntity) =>
                plainToClass(
                    DeleteEntity,
                    { ...deletedEntity, id: deletedEntity.entityId },
                    { excludeExtraneousValues: true },
                ),
            ),
        };
    }
}
