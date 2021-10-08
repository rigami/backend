import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { State } from '@/bookmarks/entities/state';
import { VCSService } from '@/vcs/service';

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

    async checkUpdate(commit: string, user: User) {
        return await this.vcsService.checkUpdate(commit, user);
    }

    async pushState(state: State, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        console.log('state:', state);

        if (state.create.length !== 0) {
            this.logger.log(`Create bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.bookmarkModel.create(state.create);
        } else {
            this.logger.log(
                `Nothing for create bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        if (state.update.length !== 0) {
            this.logger.log(`Update bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.bookmarkModel.updateMany(state.update, { $set: state.update });
        } else {
            this.logger.log(
                `Nothing for update bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        }

        /* if (state.delete.length !== 0) {
            this.logger.log(`Delete bookmarks in state for user id:${user.id} from device id:${device.id}...`);
            await this.bookmarkModel.deleteMany(
                map(state.delete, (deleteEntity) => ({
                    userId: deleteEntity.userId,
                    id: deleteEntity.entityId,
                })).reduce(
                    (acc, cur) => {
                        return {
                            userId: [...acc.userId, cur.userId],
                            id: [...acc.id, cur.id],
                        };
                    },
                    { userId: [], id: [] },
                ),
            );
        } else {
            this.logger.log(
                `Nothing for delete bookmarks in state for user id:${user.id} from device id:${device.id}...`,
            );
        } */

        const { commit, rawCommit } = await this.vcsService.commit(user);

        console.log('commit:', commit)
        console.log('rawCommit:', rawCommit)

        this.logger.log(
            `Finish push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        return { serverCommit: commit };
    }

    async pullState(commit: string, user: User, device: Device): Promise<any> {
        this.logger.log(
            `Pull bookmarks state for user id:${user.id} from device id:${device.id} start from commit:${commit}`,
        );

        /* const rawCommit: Commit = decodeCommit(commit);

        console.log('rawCommit:', rawCommit);

        const bookmarks = await this.bookmarkModel.find({
            userId: user.id,
            updateDate: {
                $lte: rawCommit.date,
            },
        });

        console.log('bookmarks:', bookmarks); */
    }
}
