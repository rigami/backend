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
import { SyncEntity, SyncPairEntity } from '@/sync/entities/sync';
import { PairEntity } from '@/sync/entities/pair';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { merge } from 'lodash';
import { DevicesService } from '@/auth/devices/service';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private devicesService: DevicesService,
        private vcsService: VCSService,
        private foldersService: FoldersSyncService,
        @InjectModel(HistorySchema)
        private readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {}

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

        const now = Date.now().valueOf();
        const { commit: serverHeadCommit } = await this.vcsService.getHead(user);

        const { rawCommit: localRawCommit } = pushRequest.localCommit
            ? this.vcsService.decodeCommit(pushRequest.localCommit)
            : { rawCommit: null };

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
            const mergeEntity = async (entity) => {
                let cloudEntity = await this.foldersService.exist({ id: null, ...entity.payload }, user);

                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.updateDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('CREATE: Update on client');
                        mergeResult.pair.push({
                            localId: entity.tempId,
                            cloudId: cloudEntity.id,
                            entityType: entity.entityType,
                        });
                        mergeResult.update.push({
                            id: cloudEntity.id,
                            entityType: entity.entityType,
                            payload: cloudEntity,
                            updateDate: cloudEntity.updateDate,
                            createDate: cloudEntity.createDate,
                            updateCommit: cloudEntity.updateCommit,
                            createCommit: cloudEntity.createCommit,
                        });
                    } else {
                        console.log('CREATE: Update on server');
                        await this.foldersService.update(
                            {
                                ...entity.payload,
                                id: cloudEntity.id,
                                updateDate: entity.updateDate,
                                createDate: entity.createDate,
                            },
                            user,
                            stage,
                        );
                        mergeResult.pair.push({
                            localId: entity.tempId,
                            cloudId: cloudEntity.id,
                            entityType: entity.entityType,
                        });
                    }
                } else {
                    console.log('CREATE: Create on server');
                    cloudEntity = await this.foldersService.create(
                        {
                            ...entity.payload,
                            updateDate: entity.updateDate,
                            createDate: entity.createDate,
                        },
                        user,
                        stage,
                    );
                    mergeResult.pair.push({
                        localId: entity.tempId,
                        cloudId: cloudEntity.id,
                        entityType: entity.entityType,
                    });
                }

                return {
                    localId: entity.tempId,
                    cloudId: cloudEntity.id,
                };
            };

            const pairFolderIds = await this.foldersService.merge(
                pushRequest.create.filter((entity) => entity.entityType === 'folder'),
                mergeEntity,
            );

            for (const entity of pushRequest.create) {
                if (entity.entityType === 'folder') continue;

                await mergeEntity(entity);
            }
        }

        if (pushRequest.update.length !== 0) {
            const mergeEntity = async (entity) => {
                const cloudEntity = await this.foldersService.exist({ id: entity.id, ...entity.payload }, user);
                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.updateDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('UPDATE: Update on client');
                        mergeResult.update.push({
                            id: entity.id,
                            entityType: entity.entityType,
                            payload: cloudEntity,
                            updateDate: cloudEntity.updateDate,
                            createDate: cloudEntity.createDate,
                            updateCommit: cloudEntity.updateCommit,
                            createCommit: cloudEntity.createCommit,
                        });
                    } else {
                        console.log('UPDATE: Update on server');
                        await this.foldersService.update(
                            {
                                ...entity.payload,
                                id: cloudEntity.id,
                                updateDate: entity.updateDate,
                                createDate: entity.createDate,
                            },
                            user,
                            stage,
                        );
                    }
                } else {
                    const historyEntity = await this.historyModel.findOne({
                        userId: user.id,
                        action: HISTORY_ACTION.delete,
                        entityType: entity.entity,
                        entityId: entity.cloudId,
                    });

                    if (historyEntity && historyEntity.date.valueOf() > localDate) {
                        console.log('UPDATE: Delete on client');
                        mergeResult.delete.push({
                            id: entity.id,
                            entityType: entity.entityType,
                            deleteDate: historyEntity.date,
                        });
                    } else {
                        console.log('UPDATE: Create on server');
                        await this.foldersService.create(
                            {
                                id: entity.id,
                                ...entity.payload,
                                updateDate: entity.updateDate,
                                createDate: entity.createDate,
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
            const mergeEntity = async (entity) => {
                const cloudEntity = await this.foldersService.exist({ id: entity.id, ...entity.payload }, user);
                const cloudDate = cloudEntity?.updateDate.valueOf();
                const localDate = entity.deleteDate.valueOf();

                if (cloudEntity) {
                    if (cloudDate > localDate) {
                        console.log('DELETE: Create on client');
                        mergeResult.create.push({
                            id: cloudEntity.id,
                            entityType: entity.entityType,
                            payload: cloudEntity,
                            updateDate: cloudEntity.updateDate,
                            createDate: cloudEntity.createDate,
                            updateCommit: cloudEntity.updateCommit,
                            createCommit: cloudEntity.createCommit,
                        });
                    } else {
                        console.log('DELETE: Delete on server');
                        await this.foldersService.delete(entity, user, stage);
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

        const folders = await this.foldersService.get(fromRawCommit, toRawCommit, user, device);

        return {
            headCommit: serverHeadCommit,
            create: folders.create.map((entity) => ({
                id: entity.id,
                entityType: 'folder',
                payload: entity,
                updateDate: entity.updateDate,
                createDate: entity.createDate,
                updateCommit: entity.updateCommit,
                createCommit: entity.createCommit,
            })),
            update: folders.update.map((entity) => ({
                id: entity.id,
                entityType: 'folder',
                payload: entity,
                updateDate: entity.updateDate,
                createDate: entity.createDate,
                updateCommit: entity.updateCommit,
                createCommit: entity.createCommit,
            })),
            delete: folders.delete,
        };
    }
}
