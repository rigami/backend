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

@Injectable()
export class BookmarksService {
    private readonly logger = new Logger(BookmarksService.name);

    constructor(
        @InjectModel(BookmarkSchema)
        private readonly bookmarkModel: ReturnModelType<typeof BookmarkSchema>,
        private readonly vcsService: VCSService,
    ) {
        bookmarkModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop bookmarks! Because set development mode');
        });
    }

    async checkUpdate(localCommit: string, user: User) {
        return await this.vcsService.checkUpdateOrInit(localCommit, user);
    }

    async pushState(state: State, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        const { rawCommit: rawLocalCommit } = this.vcsService.decodeCommit(state.commit);

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
            await this.bookmarkModel.updateMany(state.update, {
                $set: state.update.map((bookmark) => ({
                    ...bookmark,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    commit: stage.commit,
                })),
            });
        } else {
            this.logger.log(
                `Nothing for update bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.delete.length !== 0) {
            this.logger.log(`Delete bookmarks in state for user id:${user.id} from device id:${device.id}...`);

            await this.bookmarkModel.deleteMany(
                state.delete.reduce(
                    (acc, curEntityId) => ({
                        userId: { $in: [...acc.userId.$in, user.id] },
                        id: { $in: [...acc.id.$in, curEntityId] },
                    }),
                    { userId: { $in: [] }, id: { $in: [] } },
                ),
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

    async pullState(localCommit: string, user: User, device: Device): Promise<Bookmark[]> {
        this.logger.log(
            `Pull bookmarks state for user id:${user.id} from device id:${device.id} start from commit:${localCommit}`,
        );

        const { rawCommit: localRawCommit } = this.vcsService.decodeCommit(localCommit);

        const bookmarks = await this.bookmarkModel
            .find({
                userId: user.id,
                commit: { $gt: localRawCommit.head },
            })
            .lean()
            .exec();

        return bookmarks.map((bookmark) => plainToClass(Bookmark, bookmark, { excludeExtraneousValues: true }));
    }
}
