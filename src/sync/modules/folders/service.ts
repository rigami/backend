import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { FolderSnapshotSchema } from './schemas/folder.snapshot';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Folder } from '@/sync/modules/folders/entities/folder';
import { FolderSnapshot } from '@/sync/modules/folders/entities/folder.snapshot';
import { plainToClass } from 'class-transformer';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { merge, omitBy } from 'lodash';
import { ItemSyncService } from '@/sync/modules/ItemSyncService';
import { SyncPairEntity } from '@/sync/entities/sync';

@Injectable()
export class FoldersSyncService extends ItemSyncService<Folder, FolderSnapshot> {
    private readonly logger = new Logger(FoldersSyncService.name);

    constructor(
        @InjectModel(FolderSnapshotSchema)
        readonly folderModel: ReturnModelType<typeof FolderSnapshotSchema>,
        @InjectModel(HistorySchema)
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        super(folderModel, historyModel);
    }

    async processSequentially(folders, processFolder): Promise<any> {
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
                        parentTempId: null,
                    },
                });

                pairFoldersIds[pair.localId] = pair.cloudId;
            }
        }

        return pairFoldersIds;
    }

    async exist(searchFolder: Folder, user: User): Promise<SyncPairEntity> {
        let folder;

        if (searchFolder.id) {
            folder = await this.existById(searchFolder.id, user);

            if (folder) return folder;
        }

        folder = await this.folderModel.findOne({
            name: searchFolder.name,
            userId: user.id,
        });

        return (
            folder && plainToClass(SyncPairEntity, { ...folder, payload: folder }, { excludeExtraneousValues: true })
        );
    }

    async create(folder: FolderSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        const createdFolder = await this.folderModel.create({
            ...folder,
            lastAction: STATE_ACTION.create,
            userId: user.id,
            createCommit: stage.commit,
            updateCommit: stage.commit,
        });

        return plainToClass(
            SyncPairEntity,
            { ...createdFolder, payload: createdFolder },
            { excludeExtraneousValues: true },
        );
    }

    async update(folder: FolderSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
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

        const updatedFolder = await this.folderModel.findOne({ id: folder.id, userId: user.id });

        return plainToClass(
            SyncPairEntity,
            { ...updatedFolder, payload: updatedFolder },
            { excludeExtraneousValues: true },
        );
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

    async get(fromCommit: Commit, toCommit: Commit, user: User) {
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
