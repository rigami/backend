import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { State } from '@/bookmarks/entities/state';
import { VCSService } from '@/vcs/service';
import { Bookmark } from '@/bookmarks/entities/bookmark';
import { plainToClass } from 'class-transformer';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';
import { DeletedBookmarkSchema } from '@/bookmarks/schemas/deletedBookmark';

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
        return await this.vcsService.checkUpdateOrInit(localCommit, user);
    }

    async pushState(state: State, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        // const { rawCommit: rawLocalCommit } = this.vcsService.decodeCommit(state.commit);

        // TODO: Added check all staged items time >= local commit head

        const stage = await this.vcsService.stage(user);

        if (state.create.length !== 0) {
            this.logger.log(`Create bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.bookmarkModel.create(
                state.create.map((bookmark) => ({
                    ...bookmark,
                    lastAction: STATE_ACTION.create,
                    userId: user.id,
                    commit: stage.commit,
                })),
            );
        } else {
            this.logger.log(
                `Nothing for create bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.update.length !== 0) {
            this.logger.log(`Update bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await Promise.all(
                state.update.map((bookmark) =>
                    this.bookmarkModel.update(
                        { id: bookmark.id, userId: user.id },
                        {
                            $set: {
                                ...bookmark,
                                lastAction: STATE_ACTION.update,
                                userId: user.id,
                                commit: stage.commit,
                            },
                        },
                    ),
                ),
            );
        } else {
            this.logger.log(
                `Nothing for update bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.delete.length !== 0) {
            this.logger.log(`Delete bookmarks in state for user id:${user.id} from device id:${device.id}...`);

            await this.bookmarkModel.deleteMany(
                state.delete.reduce(
                    (acc, deletedEntity) => ({
                        userId: { $in: [...acc.userId.$in, user.id] },
                        id: { $in: [...acc.id.$in, deletedEntity.id] },
                    }),
                    { userId: { $in: [] }, id: { $in: [] } },
                ),
            );
            await this.deletedBookmarkModel.create(
                state.delete.map((deletedEntity) => ({
                    id: deletedEntity.id,
                    userId: user.id,
                    updateDate: deletedEntity.updateDate,
                    commit: stage.commit,
                })),
            );
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
        this.logger.log(
            `Pull bookmarks state for user id:${user.id} from device id:${device.id} start from commit:${localCommit}`,
        );

        const { commit: serverCommit } = await this.vcsService.getHead(user);
        const { rawCommit: localRawCommit } = this.vcsService.decodeCommit(localCommit);

        const createBookmarks = await this.bookmarkModel
            .find({
                userId: user.id,
                lastAction: STATE_ACTION.create,
                commit: { $gt: localRawCommit.head },
            })
            .lean()
            .exec();

        const updateBookmarks = await this.bookmarkModel
            .find({
                userId: user.id,
                lastAction: STATE_ACTION.update,
                commit: { $gt: localRawCommit.head },
            })
            .lean()
            .exec();

        const deletedBookmarks = await this.deletedBookmarkModel
            .find({
                userId: user.id,
                commit: { $gt: localRawCommit.head },
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
            delete: deletedBookmarks.map((bookmark) => bookmark.id),
        };
    }
}
