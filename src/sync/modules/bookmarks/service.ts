import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/delete';
import { BookmarkPush } from '@/sync/modules/bookmarks/entities/bookmarkPush';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { BookmarksPush } from '@/sync/modules/bookmarks/entities/push';

@Injectable()
export class BookmarksSyncService {
    private readonly logger = new Logger(BookmarksSyncService.name);

    constructor(
        @InjectModel(BookmarkSchema)
        private readonly bookmarkModel: ReturnModelType<typeof BookmarkSchema>,
    ) {}

    async saveNewBookmarks(bookmarks: BookmarkPush[], user: User, stage: Stage) {
        await this.bookmarkModel.create(
            bookmarks.map((bookmark) => ({
                ...bookmark,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                createCommit: stage.commit,
                updateCommit: stage.commit,
            })),
        );
    }

    async updateBookmarks(bookmarks: BookmarkPush[], user: User, stage: Stage) {
        /* await Promise.all(
            bookmarks.map((bookmark) =>
                this.bookmarkModel.update({ id: bookmark.id, userId: user.id }, [
                    {
                        $set: {
                            ...bookmark,
                            userId: user.id,
                            updateCommit: stage.commit,
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
        ); */
    }

    async deleteBookmarks(bookmarks: DeleteEntity[], user: User, stage: Stage) {
        /* await Promise.all(
            bookmarks.map((bookmark) =>
                this.bookmarkModel.update({ id: bookmark.id, userId: user.id }, [
                    {
                        $set: {
                            userId: user.id,
                            updateCommit: stage.commit,
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
        ); */
    }

    async pushState(stage: Stage, localCommit: Commit, state: BookmarksPush, user: User, device: Device): Promise<any> {
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

    async pullState(fromCommit: Commit, toCommit: Commit, user: User, device: Device): Promise<BookmarksPush> {
        this.logger.log(`Pull bookmarks state for user.id:${user.id} device.id:${device.id}`);

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

        const deletedBookmarks = await this.bookmarkModel
            .find({
                ...query,
                lastAction: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createBookmarks.map((bookmark) =>
                plainToClass(BookmarkPush, bookmark, { excludeExtraneousValues: true }),
            ),
            update: updateBookmarks.map((bookmark) =>
                plainToClass(BookmarkPush, bookmark, { excludeExtraneousValues: true }),
            ),
            delete: deletedBookmarks.map((bookmark) =>
                plainToClass(DeleteEntity, bookmark, { excludeExtraneousValues: true }),
            ),
        };
    }
}
