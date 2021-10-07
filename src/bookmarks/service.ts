import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { ReturnModelType } from '@typegoose/typegoose';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { State } from '@/bookmarks/entities/state';
import { StateHashSchema } from '@/bookmarks/schemas/stateHash';
import { v4 as UUIDv4 } from 'uuid';

@Injectable()
export class BookmarksService {
    private readonly logger = new Logger(BookmarksService.name);

    constructor(
        @InjectModel(BookmarkSchema)
        private readonly bookmarkModel: ReturnModelType<typeof BookmarkSchema>,
        @InjectModel(StateHashSchema)
        private readonly stateHashModel: ReturnModelType<typeof StateHashSchema>,
    ) {
        bookmarkModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop bookmarks! Because set development mode');
        });
        stateHashModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop bookmarks states! Because set development mode');
        });
    }

    async checkUpdate(localHash: string, user: User) {
        const serverState = await this.stateHashModel.findOne({ userId: user.id });

        if (!serverState || serverState.hash === localHash) {
            return {
                existUpdate: false,
            };
        }

        return {
            existUpdate: true,
            serverHashState: serverState.hash,
        };
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

        const updateHash = UUIDv4();

        await this.stateHashModel.create({
            userId: user.id,
            hash: updateHash,
        });

        this.logger.log(
            `Finish push bookmarks state for user id:${user.id} from device id:${device.id} { create: ${state.create.length} update: ${state.update.length} delete: ${state.delete.length} }`,
        );

        return {
            serverHashState: updateHash,
        };
    }
}
