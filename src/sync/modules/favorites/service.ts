import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { FavoriteSnapshotSchema } from './schemas/favorite.snapshot';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { ItemSyncService } from '@/sync/modules/ItemSyncService';
import { SyncPairEntity } from '@/sync/entities/sync';
import { Favorite } from '@/sync/modules/favorites/entities/favorite';
import { FavoriteSnapshot } from '@/sync/modules/favorites/entities/favorite.snapshot';

@Injectable()
export class FavoritesSyncService extends ItemSyncService<Favorite, FavoriteSnapshot> {
    private readonly logger = new Logger(FavoritesSyncService.name);

    constructor(
        @InjectModel(FavoriteSnapshotSchema)
        readonly favoriteModel: ReturnModelType<typeof FavoriteSnapshotSchema>,
        @InjectModel(HistorySchema)
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        super(favoriteModel, historyModel);
    }

    async processSequentially(tags, processFavorite, foldersPairs, tagsPairs, bookmarksPairs) {
        const pairFavoritesIds = {};

        const pairs = {
            bookmark: bookmarksPairs,
            folder: foldersPairs,
            tag: tagsPairs,
        };

        for (const entity of tags) {
            const pair = await processFavorite({
                ...entity,
                payload: {
                    ...entity.payload,
                    itemId: entity.payload.itemId || pairs[entity.payload.itemType][entity.payload.itemTempId],
                    itemTempId: null,
                },
            });

            pairFavoritesIds[pair.localId] = pair.cloudId;
        }

        return pairFavoritesIds;
    }

    async exist(searchFavorite: Favorite, user: User): Promise<SyncPairEntity> {
        let favorite;

        if (searchFavorite.id) {
            favorite = await this.existById(searchFavorite.id, user);

            if (favorite) return favorite;
        }

        favorite = await this.favoriteModel
            .findOne({
                itemType: searchFavorite.itemType,
                itemId: searchFavorite.itemId,
                userId: user.id,
            })
            .lean()
            .exec();

        return (
            favorite &&
            plainToClass(SyncPairEntity, { ...favorite, payload: favorite }, { excludeExtraneousValues: true })
        );
    }

    async create(favorite: FavoriteSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        const createdFavorite = (
            await this.favoriteModel.create({
                ...favorite,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                createCommit: stage.commit,
                updateCommit: stage.commit,
            })
        ).toJSON();

        return plainToClass(
            SyncPairEntity,
            { ...createdFavorite, payload: createdFavorite },
            { excludeExtraneousValues: true },
        );
    }

    async update(favorite: FavoriteSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        await this.favoriteModel.updateOne(
            {
                id: favorite.id,
                userId: user.id,
            },
            {
                $set: {
                    ...favorite,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    createCommit: stage.commit,
                    updateCommit: stage.commit,
                },
            },
        );

        const updatedFavorite = await this.favoriteModel.findOne({ id: favorite.id, userId: user.id }).lean().exec();

        return plainToClass(
            SyncPairEntity,
            { ...updatedFavorite, payload: updatedFavorite },
            { excludeExtraneousValues: true },
        );
    }

    async delete(deleteEntity: DeletePairEntity, user: User, stage: Stage) {
        await this.favoriteModel.deleteOne({
            id: deleteEntity.id,
            userId: user.id,
        });
        await this.historyModel.create({
            userId: user.id,
            action: HISTORY_ACTION.delete,
            entityType: 'favorite',
            entityId: deleteEntity.id,
            date: deleteEntity.deleteDate,
            commit: stage.commit,
        });
    }

    async get(fromCommit: Commit, toCommit: Commit, user: User) {
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

        const createFavorites = await this.favoriteModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateFavorites = await this.favoriteModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        if (!fromCommit) {
            return {
                create: [...createFavorites, ...updateFavorites].map((favorite) =>
                    plainToClass(
                        FavoriteSnapshot,
                        { ...favorite, lastAction: STATE_ACTION.create },
                        { excludeExtraneousValues: true },
                    ),
                ),
                update: [],
                delete: [],
            };
        }

        const deletedFavorites = await this.historyModel
            .find({
                userId: user.id,
                commit: query.updateCommit,
                entityType: 'favorite',
                action: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createFavorites.map((favorite) =>
                plainToClass(FavoriteSnapshot, favorite, { excludeExtraneousValues: true }),
            ),
            update: updateFavorites.map((favorite) =>
                plainToClass(FavoriteSnapshot, favorite, { excludeExtraneousValues: true }),
            ),
            delete: deletedFavorites.map((deletedEntity) =>
                plainToClass(
                    DeleteEntity,
                    { ...deletedEntity, id: deletedEntity.entityId },
                    { excludeExtraneousValues: true },
                ),
            ),
        };
    }
}
