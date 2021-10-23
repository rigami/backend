import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/delete';
import { Bookmark } from '@/sync/modules/bookmarks/entities/bookmark';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/synced';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { BookmarksState } from '@/sync/modules/bookmarks/entities/state';

@Injectable()
export class BookmarksSyncService {
    private readonly logger = new Logger(BookmarksSyncService.name);

    constructor(
        @InjectModel(BookmarkSchema)
        private readonly bookmarkModel: ReturnModelType<typeof BookmarkSchema>,
    ) {}

    async saveNewBookmarks(bookmarks: Bookmark[], user: User, stage: Stage) {
        await this.bookmarkModel.create(
            bookmarks.map((bookmark) => ({
                ...bookmark,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                commit: stage.commit,
            })),
        );
    }

    async updateBookmarks(bookmarks: Bookmark[], user: User, stage: Stage) {
        await Promise.all(
            bookmarks.map((bookmark) =>
                this.bookmarkModel.update({ id: bookmark.id, userId: user.id }, [
                    {
                        $set: {
                            ...bookmark,
                            userId: user.id,
                            commit: stage.commit,
                            lastAction: {
                                $cond: {
                                    if: { $gt: [bookmark.updateDate, '$updateDate'] },
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

    async deleteBookmarks(bookmarks: DeleteEntity[], user: User, stage: Stage) {
        await Promise.all(
            bookmarks.map((bookmark) =>
                this.bookmarkModel.update({ id: bookmark.id, userId: user.id }, [
                    {
                        $set: {
                            ...bookmark,
                            userId: user.id,
                            commit: stage.commit,
                            lastAction: {
                                $cond: {
                                    if: { $gt: [bookmark.updateDate, '$updateDate'] },
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

    async pushState(stage: Stage, state: BookmarksState, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push bookmarks state for user.id:${user.id} device.id:${device.id}
            Summary:
            Create: ${state.create.length}
            Update: ${state.update.length}
            Delete: ${state.delete.length}`,
        );

        if (state.create.length !== 0) {
            await this.saveNewBookmarks(state.create, user, stage);
        }

        if (state.update.length !== 0) {
            await this.updateBookmarks(state.update, user, stage);
        }

        if (state.delete.length !== 0) {
            await this.deleteBookmarks(state.delete, user, stage);
        }
    }

    async pullState(fromCommit: Commit, toCommit: Commit, user: User, device: Device): Promise<BookmarksState> {
        this.logger.log(`Pull bookmarks state for user.id:${user.id} device.id:${device.id}`);

        let query;

        if (fromCommit) {
            query = {
                userId: user.id,
                commit: { $gt: fromCommit.head },
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

        const deletedBookmarks = await this.bookmarkModel
            .find({
                ...query,
                lastAction: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createBookmarks.map((bookmark) =>
                plainToClass(Bookmark, bookmark, { excludeExtraneousValues: true }),
            ),
            update: updateBookmarks.map((bookmark) =>
                plainToClass(Bookmark, bookmark, { excludeExtraneousValues: true }),
            ),
            delete: deletedBookmarks.map((bookmark) =>
                plainToClass(DeleteEntity, bookmark, { excludeExtraneousValues: true }),
            ),
        };
    }
}
