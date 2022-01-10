import { Injectable, Logger } from '@nestjs/common';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { FoldersSyncService } from '@/sync/modules/folders/service';
import { VCSService } from '@/utils/vcs/service';
import { Commit } from '@/utils/vcs/entities/commit';
import { PullResponseEntity } from '@/sync/entities/response.pull';
import { PullRequestEntity } from '@/sync/entities/request.pull';
import { PushRequestEntity } from '@/sync/entities/request.push';
import { CheckUpdateRequestEntity } from '@/sync/entities/request.checkUpdate';
import { CheckUpdateResponseEntity } from '@/sync/entities/response.checkUpdate';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { PushResponseEntity } from '@/sync/entities/response.push';
import { CreatePairEntity, SyncPairEntity } from '@/sync/entities/sync';
import { PairEntity } from '@/sync/entities/pair';
import { DeletePairEntity } from '@/sync/entities/delete';
import { DevicesService } from '@/auth/devices/service';
import { BookmarksSyncService } from '@/sync/modules/bookmarks/service';
import { TagsSyncService } from '@/sync/modules/tags/service';
import { Action } from '@/sync/utils/actions';
import { FavoritesSyncService } from '@/sync/modules/favorites/service';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    private services: {
        folder: FoldersSyncService;
        bookmark: BookmarksSyncService;
        tag: TagsSyncService;
        favorite: FavoritesSyncService;
    };

    constructor(
        private devicesService: DevicesService,
        private vcsService: VCSService,
        private foldersService: FoldersSyncService,
        private bookmarksService: BookmarksSyncService,
        private tagsService: TagsSyncService,
        private favoritesService: FavoritesSyncService,
        @InjectModel(HistorySchema)
        private readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        this.services = {
            folder: this.foldersService,
            bookmark: this.bookmarksService,
            tag: this.tagsService,
            favorite: this.favoritesService,
        };
    }

    async checkUpdate(checkUpdateRequest: CheckUpdateRequestEntity, user: User): Promise<CheckUpdateResponseEntity> {
        const { existUpdate, headCommit } = await this.vcsService.checkUpdate(checkUpdateRequest.fromCommit, user);

        return {
            existUpdate,
            headCommit,
        };
    }

    async pushState(pushRequest: PushRequestEntity, user: User, device: Device): Promise<PushResponseEntity> {
        this.logger.log(`Push state {user.id:${user.id} device.id:${device.id}}...`);

        await this.devicesService.updateLastActivity(device);

        if (pushRequest.create.length === 0 && pushRequest.update.length === 0 && pushRequest.delete.length === 0) {
            this.logger.log(`Nothing for push {user.id:${user.id} device.id:${device.id}}. Skip...`);

            return {
                existUpdate: false,
                fromCommit: null,
                toCommit: null,
                headCommit: pushRequest.localCommit,
                create: [],
                pair: [],
                update: [],
                delete: [],
            };
        }

        const { commit: serverHeadCommit } = await this.vcsService.getHead(user);

        const stage = await this.vcsService.stage(user);

        const mergeResult: {
            create: SyncPairEntity[];
            pair: PairEntity[];
            update: SyncPairEntity[];
            delete: DeletePairEntity[];
        } = {
            create: [],
            pair: [],
            update: [],
            delete: [],
        };

        if (pushRequest.create.length !== 0) {
            const mergeEntity = async (entity: CreatePairEntity) => {
                let cloudEntity = await this.services[entity.entityType].exist({ id: null, ...entity.payload }, user);

                console.log('cloudEntity:', cloudEntity);

                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.updateDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('CREATE: Update on client');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.UPDATE_CLIENT,
                            user,
                        );

                        console.log('pair:', {
                            localId: entity.tempId,
                            cloudId: mergedEntity.id,
                            entityType: mergedEntity.entityType,
                        });
                        mergeResult.pair.push({
                            localId: entity.tempId,
                            cloudId: mergedEntity.id,
                            entityType: mergedEntity.entityType,
                        });
                        mergeResult.update.push(mergedEntity);
                    } else {
                        console.log('CREATE: Update on server');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.UPDATE_SERVER,
                            user,
                        );

                        await this.services[mergedEntity.entityType].update(
                            {
                                ...mergedEntity.payload,
                                id: mergedEntity.id,
                                updateDate: mergedEntity.updateDate,
                                createDate: mergedEntity.createDate,
                            },
                            user,
                            stage,
                        );
                        console.log('pair:', {
                            localId: entity.tempId,
                            cloudId: mergedEntity.id,
                            entityType: mergedEntity.entityType,
                        });
                        mergeResult.pair.push({
                            localId: entity.tempId,
                            cloudId: mergedEntity.id,
                            entityType: mergedEntity.entityType,
                        });
                    }
                } else {
                    console.log('CREATE: Create on server', entity, cloudEntity);

                    const mergedEntity = await this.services[entity.entityType].merge(
                        entity,
                        cloudEntity,
                        Action.CREATE_SERVER,
                        user,
                    );

                    console.log('mergedEntity:', mergedEntity);

                    cloudEntity = await this.services[mergedEntity.entityType].create(
                        {
                            ...mergedEntity.payload,
                            updateDate: mergedEntity.updateDate,
                            createDate: mergedEntity.createDate,
                        },
                        user,
                        stage,
                    );

                    console.log('cloudEntity:', cloudEntity);

                    console.log('pair:', {
                        localId: entity.tempId,
                        cloudId: cloudEntity.id,
                        entityType: mergedEntity.entityType,
                    });
                    mergeResult.pair.push({
                        localId: entity.tempId,
                        cloudId: cloudEntity.id,
                        entityType: mergedEntity.entityType,
                    });
                }

                return {
                    localId: entity.tempId,
                    cloudId: cloudEntity.id,
                };
            };

            const folderCloudIdsByLocalIds = await this.foldersService.processSequentially(
                pushRequest.create.filter((entity) => entity.entityType === 'folder'),
                mergeEntity,
            );

            const tagCloudIdsByLocalIds = await this.tagsService.processSequentially(
                pushRequest.create.filter((entity) => entity.entityType === 'tag'),
                mergeEntity,
            );

            const bookmarksCloudIdsByLocalIds = await this.bookmarksService.processSequentially(
                pushRequest.create.filter((entity) => entity.entityType === 'bookmark'),
                mergeEntity,
                folderCloudIdsByLocalIds,
                tagCloudIdsByLocalIds,
            );

            await this.favoritesService.processSequentially(
                pushRequest.create.filter((entity) => entity.entityType === 'favorite'),
                mergeEntity,
                folderCloudIdsByLocalIds,
                tagCloudIdsByLocalIds,
                bookmarksCloudIdsByLocalIds,
            );
        }

        if (pushRequest.update.length !== 0) {
            const mergeEntity = async (entity: SyncPairEntity) => {
                const cloudEntity = await this.services[entity.entityType].exist(
                    { id: entity.id, ...entity.payload },
                    user,
                );
                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.updateDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('UPDATE: Update on client');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.UPDATE_CLIENT,
                            user,
                        );

                        mergeResult.update.push(mergedEntity);
                    } else {
                        console.log('UPDATE: Update on server');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.UPDATE_SERVER,
                            user,
                        );

                        await this.services[mergedEntity.entityType].update(
                            {
                                ...mergedEntity.payload,
                                id: mergedEntity.id,
                                updateDate: mergedEntity.updateDate,
                                createDate: mergedEntity.createDate,
                            },
                            user,
                            stage,
                        );
                    }
                } else {
                    const historyEntity = await this.historyModel.findOne({
                        userId: user.id,
                        action: HISTORY_ACTION.delete,
                        entityType: entity.entityType,
                        entityId: entity.id,
                    });

                    if (historyEntity && historyEntity.date.valueOf() > localDate) {
                        console.log('UPDATE: Delete on client');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.DELETE_CLIENT,
                            user,
                        );

                        mergeResult.delete.push({
                            id: mergedEntity.id,
                            entityType: mergedEntity.entityType,
                            deleteDate: historyEntity.date,
                        });
                    } else {
                        console.log('UPDATE: Create on server');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            entity,
                            cloudEntity,
                            Action.CREATE_SERVER,
                            user,
                        );

                        await this.services[mergedEntity.entityType].create(
                            {
                                id: mergedEntity.id,
                                ...mergedEntity.payload,
                                updateDate: mergedEntity.updateDate,
                                createDate: mergedEntity.createDate,
                            },
                            user,
                            stage,
                        );
                    }
                }

                return {
                    localId: entity.id,
                    cloudId: cloudEntity.id,
                };
            };

            for (const entity of pushRequest.update) {
                await mergeEntity(entity);
            }
        }

        if (pushRequest.delete.length !== 0) {
            const mergeEntity = async (entity: DeletePairEntity) => {
                const cloudEntity = await this.services[entity.entityType].existById(entity.id, user);
                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.deleteDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('DELETE: Create on client');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            {
                                tempId: entity.id,
                                createDate: cloudEntity.createDate,
                                entityType: entity.entityType,
                                payload: {},
                                updateDate: entity.deleteDate,
                            },
                            cloudEntity,
                            Action.CREATE_CLIENT,
                            user,
                        );

                        mergeResult.create.push(mergedEntity);
                    } else {
                        console.log('DELETE: Delete on server');

                        const mergedEntity = await this.services[entity.entityType].merge(
                            {
                                tempId: entity.id,
                                createDate: cloudEntity.createDate,
                                entityType: entity.entityType,
                                payload: {},
                                updateDate: entity.deleteDate,
                            },
                            cloudEntity,
                            Action.DELETE_SERVER,
                            user,
                        );

                        await this.services[mergedEntity.entityType].delete(
                            {
                                id: cloudEntity.id,
                                deleteDate: entity.deleteDate,
                                entityType: entity.entityType,
                            },
                            user,
                            stage,
                        );
                    }
                }
            };

            for (const entity of pushRequest.delete) {
                await mergeEntity(entity);
            }
        }

        const { commit: newServerHeadCommit } = await this.vcsService.commit(stage, user);

        this.logger.log(`Success push state {user.id:${user.id} device.id:${device.id}}`);

        return {
            existUpdate: serverHeadCommit !== pushRequest.localCommit,
            fromCommit: pushRequest.localCommit || null,
            toCommit: serverHeadCommit,
            headCommit: newServerHeadCommit,
            create: mergeResult.create,
            pair: mergeResult.pair,
            update: mergeResult.update,
            delete: mergeResult.delete,
        };
    }

    async pullState(pullRequest: PullRequestEntity, user: User, device: Device): Promise<PullResponseEntity> {
        const { commit: serverHeadCommit } = await this.vcsService.getHead(user);

        await this.devicesService.updateLastActivity(device);

        if (serverHeadCommit === pullRequest.fromCommit) return null;

        this.logger.log(
            `Pull bookmarks state {user.id:${user.id} device.id:${device.id}}
            start commit:${pullRequest.fromCommit}
            end commit:${pullRequest.toCommit}`,
        );

        const fromRawCommit: Commit = pullRequest.fromCommit
            ? this.vcsService.decodeCommit(pullRequest.fromCommit).rawCommit
            : null;
        const toRawCommit: Commit = pullRequest.toCommit
            ? this.vcsService.decodeCommit(pullRequest.toCommit).rawCommit
            : null;

        const folders = await this.foldersService.get(fromRawCommit, toRawCommit, user);
        const bookmarks = await this.bookmarksService.get(fromRawCommit, toRawCommit, user);
        const tags = await this.tagsService.get(fromRawCommit, toRawCommit, user);
        const favorites = await this.favoritesService.get(fromRawCommit, toRawCommit, user);

        return {
            headCommit: serverHeadCommit,
            create: [
                ...folders.create.map((entity) => ({ entity, type: 'folder' })),
                ...bookmarks.create.map((entity) => ({ entity, type: 'bookmark' })),
                ...tags.create.map((entity) => ({ entity, type: 'tag' })),
                ...favorites.create.map((entity) => ({ entity, type: 'favorite' })),
            ].map(
                ({
                    entity,
                    type,
                }: {
                    entity: any;
                    type: 'folder' | 'bookmark' | 'tag' | 'favorite';
                }): SyncPairEntity => ({
                    id: entity.id,
                    entityType: type,
                    payload: entity,
                    updateDate: entity.updateDate,
                    createDate: entity.createDate,
                    updateCommit: entity.updateCommit,
                    createCommit: entity.createCommit,
                }),
            ),
            update: [
                ...folders.update.map((entity) => ({ entity, type: 'folder' })),
                ...bookmarks.update.map((entity) => ({ entity, type: 'bookmark' })),
                ...tags.update.map((entity) => ({ entity, type: 'tag' })),
                ...favorites.update.map((entity) => ({ entity, type: 'favorite' })),
            ].map(
                ({
                    entity,
                    type,
                }: {
                    entity: any;
                    type: 'folder' | 'bookmark' | 'tag' | 'favorite';
                }): SyncPairEntity => ({
                    id: entity.id,
                    entityType: type,
                    payload: entity,
                    updateDate: entity.updateDate,
                    createDate: entity.createDate,
                    updateCommit: entity.updateCommit,
                    createCommit: entity.createCommit,
                }),
            ),
            delete: [
                ...folders.delete.map((entity) => ({ ...entity, entityType: 'folder' })),
                ...bookmarks.delete.map((entity) => ({ ...entity, entityType: 'bookmark' })),
                ...tags.delete.map((entity) => ({ ...entity, entityType: 'tag' })),
                ...favorites.delete.map((entity) => ({ ...entity, entityType: 'favorite' })),
            ],
        };
    }
}
