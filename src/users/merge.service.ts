import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { UserMergeRequest as UserMergeRequestScheme } from './schemas/userMergeRequest';
import { ReturnModelType } from '@typegoose/typegoose';
import generateMergeCode from '@/users/utils/generateMergeCode';
import { Interval } from '@nestjs/schedule';
import { UsersService } from '@/users/service';
import { DevicesService } from '@/devices/service';

@Injectable()
export class MergeUsersService {
    private readonly logger = new Logger(MergeUsersService.name);

    constructor(
        private usersService: UsersService,
        private devicesService: DevicesService,
        @InjectModel(UserMergeRequestScheme)
        private readonly mergeUserRequestModel: ReturnModelType<typeof UserMergeRequestScheme>,
    ) {
        mergeUserRequestModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop merge users request! Because set development mode');
        });
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

        const fullMasterUser = await this.usersService.findOneById(masterUser.id);
        const mergedUser = await this.usersService.findOneById(request.mergedUserId);

        if (!mergedUser) {
            throw new Error('NOT_EXIST_MERGED_USER');
        }
        this.logger.log(`Start merge request user id:${mergedUser.id} into user id:${masterUser.id}...`);

        // TODO Merge mergedUser into masterUser

        await this.devicesService.changeOwnerByUserId(mergedUser.id, masterUser.id);

        this.logger.log(`Done merge user id:${mergedUser.id} into user id:${masterUser.id}...`);

        await this.usersService.findByIdAndDelete(request.mergedUserId);

        this.logger.log(`Remove user id:${mergedUser.id}...`);

        return {
            master: fullMasterUser,
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
