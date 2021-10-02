import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { User as UserScheme } from './schemas/user';
import { UserMergeRequest as UserMergeRequestScheme } from './schemas/userMergeRequest';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import generateMergeCode from '@/users/utils/generateMergeCode';

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

    async generateMergeRequest(user: User) {
        let request;
        const code = generateMergeCode(6);

        try {
            request = await this.mergeUserRequestModel.create({
                mergedUserId: user.id,
                code,
            });
        } catch (err) {
            console.log(err);
            if (err.name === 'MongoServerError' && err.code === 11000 && 'mergedUserId' in err.keyPattern) {
                await this.mergeUserRequestModel.updateOne(
                    { mergedUserId: user.id },
                    { $set: { code } },
                );

                request = await this.mergeUserRequestModel.findOne({ mergedUserId: user.id });
            } else {
                throw err;
            }
        }

        return { code: request.code };
    }

    async mergeUsers(masterUser: User, code: string) {
        console.log('Merge user', 'masterUser:', masterUser);

        const request = await this.mergeUserRequestModel.findOne({ code });

        console.log('request:', request);

        if (!request) {
            throw new Error('NOT_VALID_CODE');
        }

        await this.mergeUserRequestModel.remove(request);

        const mergedUser = await this.findOneById(request.mergedUserId);

        if (!mergedUser) {
            throw new Error('NOT_EXIST_MERGED_USER');
        }

        console.log('Merge user', 'mergedUser:', mergedUser);

        // TODO Merge mergedUser into masterUser

        return {
            master: masterUser,
            merged: mergedUser,
        };
    }
}
