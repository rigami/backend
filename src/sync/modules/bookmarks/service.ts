import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity } from '@/sync/entities/state';
import { Bookmark } from '@/sync/modules/bookmarks/entities/bookmark';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';
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
            `Push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        if (state.create.length !== 0) {
            this.logger.log(`Create bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.saveNewBookmarks(state.create, user, stage);
        } else {
            this.logger.log(
                `Nothing for create bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.update.length !== 0) {
            this.logger.log(`Update bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.updateBookmarks(state.update, user, stage);
        } else {
            this.logger.log(
                `Nothing for update bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.delete.length !== 0) {
            this.logger.log(`Delete bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.deleteBookmarks(state.delete, user, stage);
        } else {
            this.logger.log(
                `Nothing for delete bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        this.logger.log(
            `Finish push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );
    }

    async pullState(commit: Commit, user: User, device: Device): Promise<BookmarksState> {
        this.logger.log(`Pull bookmarks state for user id:${user.id} from device id:${device.id}`);

        let query;

        if (commit) {
            query = {
                userId: user.id,
                commit: { $gt: commit.head },
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
