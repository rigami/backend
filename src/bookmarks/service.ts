import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { DeleteEntity, State } from '@/bookmarks/entities/state';
import { VCSService } from '@/vcs/service';
import { Bookmark } from '@/bookmarks/entities/bookmark';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';
import { DeletedBookmarkSchema } from '@/bookmarks/schemas/deletedBookmark';
import { Stage } from '@/vcs/entities/stage';

@Injectable()
export class BookmarksService {
    private readonly logger = new Logger(BookmarksService.name);

    constructor(
        @InjectModel(BookmarkSchema)
        private readonly bookmarkModel: ReturnModelType<typeof BookmarkSchema>,
        @InjectModel(DeletedBookmarkSchema)
        private readonly deletedBookmarkModel: ReturnModelType<typeof DeletedBookmarkSchema>,
        private readonly vcsService: VCSService,
    ) {
        /* bookmarkModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop bookmarks! Because set development mode');
        }); */
    }

    async checkUpdate(localCommit: string, user: User) {
        return await this.vcsService.checkUpdate(localCommit, user);
    }

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

    async pushState(state: State, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        const head = await this.vcsService.getHead(user);

        if (state.commit && state.commit !== head.commit) {
            throw new Error('PULL_FIRST');
        }

        // const { rawCommit: rawLocalCommit } = this.vcsService.decodeCommit(state.commit);

        // TODO: Added check all staged items time >= local commit head

        const stage = await this.vcsService.stage(user);

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

        const { commit } = await this.vcsService.commit(stage, user);

        this.logger.log(
            `Finish push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        return { serverCommit: commit };
    }

    async pullState(localCommit: string, user: User, device: Device): Promise<State> {
        const { commit: serverCommit } = await this.vcsService.getHead(user);

        if (serverCommit === localCommit) return null;

        this.logger.log(
            `Pull bookmarks state for user id:${user.id} from device id:${device.id} start from commit:${localCommit}`,
        );

        let query;

        if (localCommit) {
            const { rawCommit: localRawCommit } = this.vcsService.decodeCommit(localCommit);

            query = {
                userId: user.id,
                commit: { $gt: localRawCommit.head },
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
            commit: serverCommit,
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
