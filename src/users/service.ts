import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { User as UserScheme } from './schemas/user';
import { UserMergeRequest as UserMergeRequestScheme } from './schemas/userMergeRequest';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import generateMergeCode from '@/users/utils/generateMergeCode';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(UserScheme)
        private readonly userModel: ReturnModelType<typeof UserScheme>,
        @InjectModel(UserMergeRequestScheme)
        private readonly mergeUserRequestModel: ReturnModelType<typeof UserMergeRequestScheme>,
    ) {
        userModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop users! Because set development mode');
        });
    }

    async findOneById(userId: string): Promise<User | null> {
        const user = await this.userModel.findById(userId);

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async findOne(email: string): Promise<User | null> {
        const user = await this.userModel.findOne({
            email,
        });

        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: user.isVirtual,
            createDate: user.createDate,
        };
    }

    async createVirtualUser(): Promise<User | null> {
        this.logger.log(`Creating virtual user...`);

        const user = await this.userModel.create({
            email: UUIDv4(),
            isVirtual: true,
        });

        return {
            id: user.id,
            email: user.email,
            password: user.password,
            isVirtual: true,
            createDate: user.createDate,
        };
    }

    async createUser(email: string, password: string): Promise<User | null> {
        this.logger.log(`Creating user '${email}'...`);

        try {
            const user = await this.userModel.create({
                email,
                password,
                isVirtual: false,
            });

            return {
                id: user.id,
                email: user.email,
                password: user.password,
                isVirtual: false,
                createDate: user.createDate,
            };
        } catch (err) {
            if (err.name === 'MongoServerError' && err.code === 11000) {
                throw new Error('USER_ALREADY_EXIST');
            }
        }

        throw new Error('UNKNOWN_ERROR');
    }

    async createMergeRequest(user: User) {
        this.logger.log(`Create merge request by user id:${user.id}...`);
        let request;
        const code = generateMergeCode(6);
        const expiredDate = new Date(Date.now() + 10 * 60 * 1000);

        try {
            request = await this.mergeUserRequestModel.create({
                mergedUserId: user.id,
                code,
                expiredDate,
            });
        } catch (err) {
            if (err.name === 'MongoServerError' && err.code === 11000 && 'mergedUserId' in err.keyPattern) {
                this.logger.log(`Update merge request by user id:${user.id}...`);
                await this.mergeUserRequestModel.updateOne({ mergedUserId: user.id }, { $set: { code, expiredDate } });

                request = await this.mergeUserRequestModel.findOne({ mergedUserId: user.id });
            } else {
                this.logger.error(err);
                throw err;
            }
        }

        return { code: request.code };
    }

    async mergeUsers(masterUser: User, code: string) {
        const request = await this.mergeUserRequestModel.findOneAndDelete({ code });

        if (!request || request.expiredDate.valueOf() < Date.now()) {
            throw new Error('NOT_VALID_CODE');
        }

        const mergedUser = await this.findOneById(request.mergedUserId);

        if (!mergedUser) {
            throw new Error('NOT_EXIST_MERGED_USER');
        }

        this.logger.log(`Apply merge request user id:${mergedUser.id} into user id:${masterUser.id}...`);

        // TODO Merge mergedUser into masterUser

        return {
            master: masterUser,
            merged: mergedUser,
        };
    }

    @Interval(60 * 1000) // Clear cache every 1m
    async handleClearMergeRequests() {
        this.logger.log('Start clearing obsolete merge requests...');

        try {
            const mergeRequestsRemove = await this.mergeUserRequestModel.find({
                expiredDate: {
                    $lte: new Date(),
                },
            });

            await this.mergeUserRequestModel.deleteMany({
                expiredDate: {
                    $lte: new Date(),
                },
            });

            this.logger.log(
                `The merge requests has been cleared. Removed ${mergeRequestsRemove.length} outdated requests`,
            );
        } catch (e) {
            this.logger.error(e);
        }
    }
}
