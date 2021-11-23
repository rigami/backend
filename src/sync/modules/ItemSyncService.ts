import { Action } from '@/sync/utils/actions';
import { User } from '@/auth/users/entities/user';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { CreatePairEntity, SyncPairEntity } from '@/sync/entities/sync';
import { ReturnModelType } from '@typegoose/typegoose';
import { HistorySchema } from '@/sync/schemas/history';
import { StateEntitySchema } from '@/sync/schemas/state';
import { plainToClass } from 'class-transformer';

interface IItemSyncService<E, S> {
    processSequentially: any;
    merge(
        clientEntity: CreatePairEntity | SyncPairEntity,
        cloudEntity: SyncPairEntity,
        desiredAction: Action,
        user: User,
    ): Promise<SyncPairEntity>;
    exist(searchEntity: E, user: User): Promise<SyncPairEntity>;
    existById(searchEntityId: string, user: User): Promise<SyncPairEntity>;
    create(entity: S, user: User, stage: Stage): Promise<SyncPairEntity>;
    update(entity: S, user: User, stage: Stage): Promise<SyncPairEntity>;
    delete(entity: DeletePairEntity, user: User, stage: Stage): Promise<void>;
    get(
        fromCommit: Commit,
        toCommit: Commit,
        user: User,
    ): Promise<{ create: S[]; update: S[]; delete: DeleteEntity[] }>;
}

export class ItemSyncService<E, S> implements IItemSyncService<E, S> {
    constructor(
        readonly entityModel: ReturnModelType<typeof StateEntitySchema>,
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {}

    async merge(
        clientEntity: CreatePairEntity | SyncPairEntity,
        cloudEntity: SyncPairEntity,
        desiredAction: Action,
        user: User,
    ): Promise<SyncPairEntity> {
        if (
            desiredAction === Action.CREATE_CLIENT ||
            desiredAction === Action.UPDATE_CLIENT ||
            desiredAction === Action.DELETE_CLIENT
        ) {
            return {
                id: !(cloudEntity instanceof CreatePairEntity) ? cloudEntity.id : null,
                entityType: clientEntity.entityType,
                payload: cloudEntity,
                updateDate: cloudEntity.updateDate,
                createDate: cloudEntity.createDate,
                updateCommit: cloudEntity.updateCommit,
                createCommit: cloudEntity.createCommit,
            };
        }

        if (
            desiredAction === Action.CREATE_SERVER ||
            desiredAction === Action.UPDATE_SERVER ||
            desiredAction === Action.DELETE_SERVER
        ) {
            return {
                id: cloudEntity instanceof SyncPairEntity ? cloudEntity.id : null,
                entityType: clientEntity.entityType,
                payload: clientEntity.payload,
                updateDate: clientEntity.updateDate,
                createDate: clientEntity.createDate,
                updateCommit: clientEntity.updateCommit,
                createCommit: clientEntity.createCommit,
            };
        }

        return {
            id: !(cloudEntity instanceof CreatePairEntity) ? cloudEntity.id : null,
            entityType: cloudEntity.entityType,
            payload: cloudEntity.payload,
            updateDate: cloudEntity.updateDate,
            createDate: cloudEntity.createDate,
            updateCommit: cloudEntity.updateCommit,
            createCommit: cloudEntity.createCommit,
        };
    }

    async existById(searchId: string, user: User): Promise<SyncPairEntity> {
        const entity = await this.entityModel
            .findOne({
                id: searchId,
                userId: user.id,
            })
            .lean()
            .exec();

        return (
            entity && plainToClass(SyncPairEntity, { ...entity, payload: entity }, { excludeExtraneousValues: true })
        );
    }

    processSequentially(...args): any {
        throw new Error('Method not implemented.');
    }
    exist(searchEntity: E, user: User): Promise<SyncPairEntity> {
        throw new Error('Method not implemented.');
    }
    create(entity: S, user: User, stage: Stage): Promise<SyncPairEntity> {
        throw new Error('Method not implemented.');
    }
    update(entity: S, user: User, stage: Stage): Promise<SyncPairEntity> {
        throw new Error('Method not implemented.');
    }
    delete(entity: DeletePairEntity, user: User, stage: Stage): Promise<void> {
        throw new Error('Method not implemented.');
    }
    get(
        fromCommit: Commit,
        toCommit: Commit,
        user: User,
    ): Promise<{ create: S[]; update: S[]; delete: DeleteEntity[] }> {
        throw new Error('Method not implemented.');
    }
}
