import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/delete';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { plainToClass } from 'class-transformer';
import { HistorySchema } from '@/sync/schemas/history';
import { merge, omitBy } from 'lodash';
import { ItemSyncService } from '@/sync/modules/ItemSyncService';
import { SyncPairEntity } from '@/sync/entities/sync';
import { Setting } from './entities/setting';
import { SettingSnapshot } from './entities/setting.snapshot';
import { SettingSnapshotSchema } from './schemas/setting.snapshot';

@Injectable()
export class SettingsSyncService extends ItemSyncService<Setting, SettingSnapshot> {
    private readonly logger = new Logger(SettingsSyncService.name);

    constructor(
        @InjectModel(SettingSnapshotSchema)
        readonly settingModel: ReturnModelType<typeof SettingSnapshotSchema>,
        @InjectModel(HistorySchema)
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        super(settingModel, historyModel);
    }

    async processSequentially(settings, processSetting): Promise<any> {
        let syncedFoldersQueue = [...settings];
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
                const pair = await processSetting({
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

    async exist(searchSetting: Setting, user: User): Promise<SyncPairEntity> {
        let setting;

        console.log('setting exist check', searchSetting);

        if (searchSetting.id) {
            console.log('search setting exist check by id');
            setting = await this.existById(searchSetting.id, user);

            if (setting) return setting;
        }

        if (!setting) {
            console.log('search setting exist check by name');
            setting = await this.settingModel
                .findOne({
                    name: searchSetting.name,
                    userId: user.id,
                })
                .lean()
                .exec();
        }

        console.log('find setting exist check', setting);

        return (
            setting && plainToClass(SyncPairEntity, { ...setting, payload: setting }, { excludeExtraneousValues: true })
        );
    }

    async create(setting: SettingSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        const createdSetting = (
            await this.settingModel.create({
                ...setting,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                createCommit: stage.commit,
                updateCommit: stage.commit,
            })
        ).toJSON();

        return plainToClass(
            SyncPairEntity,
            { ...createdSetting, payload: createdSetting },
            { excludeExtraneousValues: true },
        );
    }

    async update(setting: SettingSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        await this.settingModel.updateOne(
            {
                id: setting.id,
                userId: user.id,
            },
            {
                $set: {
                    ...setting,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    createCommit: stage.commit,
                    updateCommit: stage.commit,
                },
            },
        );

        const updatedFolder = await this.settingModel.findOne({ id: setting.id, userId: user.id }).lean().exec();

        return plainToClass(
            SyncPairEntity,
            { ...updatedFolder, payload: updatedFolder },
            { excludeExtraneousValues: true },
        );
    }

    async get(fromCommit: Commit, toCommit: Commit, user: User) {
        const query = {
            userId: user.id,
            updateCommit: omitBy({ $gt: fromCommit?.head, $lte: toCommit?.head }, (date) => !date),
        };

        console.log('query:', query);

        const createSettings = await this.settingModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateSettings = await this.settingModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        if (!fromCommit) {
            return {
                create: [...createSettings, ...updateSettings].map((setting) =>
                    plainToClass(
                        SettingSnapshot,
                        { ...setting, lastAction: STATE_ACTION.create },
                        { excludeExtraneousValues: true },
                    ),
                ),
                update: [],
                delete: [],
            };
        }

        const deletedSettings = await this.historyModel
            .find({
                userId: user.id,
                commit: query.updateCommit,
                entityType: 'setting',
                action: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createSettings.map((setting) =>
                plainToClass(SettingSnapshot, setting, { excludeExtraneousValues: true }),
            ),
            update: updateSettings.map((setting) =>
                plainToClass(SettingSnapshot, setting, { excludeExtraneousValues: true }),
            ),
            delete: deletedSettings.map((deletedEntity) =>
                plainToClass(
                    DeleteEntity,
                    { ...deletedEntity, id: deletedEntity.entityId },
                    { excludeExtraneousValues: true },
                ),
            ),
        };
    }
}
