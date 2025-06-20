import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSnapshotSchema } from './schemas/bookmark.snapshot';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { Bookmark } from '@/sync/modules/bookmarks/entities/bookmark';
import { BookmarkSnapshot } from '@/sync/modules/bookmarks/entities/bookmark.snapshot';
import { ItemSyncService } from '@/sync/modules/ItemSyncService';
import { SyncPairEntity } from '@/sync/entities/sync';

@Injectable()
export class BookmarksSyncService extends ItemSyncService<Bookmark, BookmarkSnapshot> {
    private readonly logger = new Logger(BookmarksSyncService.name);

    constructor(
        @InjectModel(BookmarkSnapshotSchema)
        readonly bookmarkModel: ReturnModelType<typeof BookmarkSnapshotSchema>,
        @InjectModel(HistorySchema)
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        super(bookmarkModel, historyModel);
    }

    async processSequentially(tags, processTag, foldersPairs, tagsPairs) {
        const pairBookmarksIds = {};

        for (const entity of tags) {
            const pair = await processTag({
                ...entity,
                payload: {
                    ...entity.payload,
                    folderId: entity.payload.folderId || foldersPairs[entity.payload.folderTempId],
                    tagsIds: [
                        ...entity.payload.tagsIds,
                        ...entity.payload.tagsTempIds.map((tempId) => tagsPairs[tempId]),
                    ],
                    folderTempId: null,
                    tagsTempIds: null,
                },
            });

            pairBookmarksIds[pair.localId] = pair.cloudId;
        }

        return pairBookmarksIds;
    }

    async exist(searchBookmark: Bookmark, user: User): Promise<SyncPairEntity> {
        let bookmark;

        if (searchBookmark.id) {
            bookmark = await this.existById(searchBookmark.id, user);

            if (bookmark) return bookmark;
        }

        bookmark = await this.bookmarkModel
            .findOne({
                folderId: searchBookmark.folderId,
                title: searchBookmark.title,
                userId: user.id,
            })
            .lean()
            .exec();

        return (
            bookmark &&
            plainToClass(SyncPairEntity, { ...bookmark, payload: bookmark }, { excludeExtraneousValues: true })
        );
    }

    async create(bookmark: BookmarkSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        const createdBookmark = (
            await this.bookmarkModel.create({
                ...bookmark,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                createCommit: stage.commit,
                updateCommit: stage.commit,
            })
        ).toJSON();

        return plainToClass(
            SyncPairEntity,
            { ...createdBookmark, payload: createdBookmark },
            { excludeExtraneousValues: true },
        );
    }

    async update(bookmark: BookmarkSnapshot, user: User, stage: Stage): Promise<SyncPairEntity> {
        await this.bookmarkModel.updateOne(
            {
                id: bookmark.id,
                userId: user.id,
            },
            {
                $set: {
                    ...bookmark,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    createCommit: stage.commit,
                    updateCommit: stage.commit,
                },
            },
        );

        const updatedBookmark = await this.bookmarkModel.findOne({ id: bookmark.id, userId: user.id }).lean().exec();

        return plainToClass(
            SyncPairEntity,
            { ...updatedBookmark, payload: updatedBookmark },
            { excludeExtraneousValues: true },
        );
    }

    async delete(deleteEntity: DeletePairEntity, user: User, stage: Stage) {
        await this.bookmarkModel.deleteOne({
            id: deleteEntity.id,
            userId: user.id,
        });
        await this.historyModel.create({
            userId: user.id,
            action: HISTORY_ACTION.delete,
            entityType: 'bookmark',
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

        const createBookmarks = await this.bookmarkModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateBookmarks = await this.bookmarkModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        if (!fromCommit) {
            return {
                create: [...createBookmarks, ...updateBookmarks].map((bookmark) =>
                    plainToClass(
                        BookmarkSnapshot,
                        { ...bookmark, lastAction: STATE_ACTION.create },
                        { excludeExtraneousValues: true },
                    ),
                ),
                update: [],
                delete: [],
            };
        }

        const deletedBookmarks = await this.historyModel
            .find({
                userId: user.id,
                commit: query.updateCommit,
                entityType: 'bookmark',
                action: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createBookmarks.map((bookmark) =>
                plainToClass(BookmarkSnapshot, bookmark, { excludeExtraneousValues: true }),
            ),
            update: updateBookmarks.map((bookmark) =>
                plainToClass(BookmarkSnapshot, bookmark, { excludeExtraneousValues: true }),
            ),
            delete: deletedBookmarks.map((deletedEntity) =>
                plainToClass(
                    DeleteEntity,
                    { ...deletedEntity, id: deletedEntity.entityId },
                    { excludeExtraneousValues: true },
                ),
            ),
        };
    }
}
