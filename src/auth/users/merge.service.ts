import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { User } from './entities/user';
import { InjectModel } from 'nestjs-typegoose';
import { UserMergeRequestSchema } from './schemas/userMergeRequest';
import { ReturnModelType } from '@typegoose/typegoose';
import generateMergeCode from '@/auth/users/utils/generateMergeCode';
import { Interval } from '@nestjs/schedule';
import { UsersService } from '@/auth/users/service';
import { DevicesService } from '@/auth/devices/service';
import { SSEService } from '@/utils/sse/service';
import { AuthService } from '@/auth/auth/service';
import { v4 as UUIDv4 } from 'uuid';
import { Device } from '@/auth/devices/entities/device';

@Injectable()
export class MergeUsersService {
    private readonly logger = new Logger(MergeUsersService.name);

    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private devicesService: DevicesService,
        private sseService: SSEService,
        @InjectModel(UserMergeRequestSchema)
        private readonly mergeUserRequestModel: ReturnModelType<typeof UserMergeRequestSchema>,
    ) {}

    async createMergeRequest(user: User, device: Device) {
        let request;
        const code = generateMergeCode(6);
        const expiredDate = new Date(Date.now() + 10 * 60 * 1000);

        try {
            request = await this.mergeUserRequestModel.create({
                mergedUserId: user.id,
                mergedUserIsTemp: user.isTemp || false,
                mergedFromDeviceId: device.id,
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

    createAndWatchMergeRequest(user: User, device: Device) {
        this.logger.log(`Create merge request by user id:${user.id}...`);

        const queue = this.sseService.createQueue('merge-request', user.id);

        this.createMergeRequest(user, device).then(({ code }) => {
            if (user.isTemp) {
                this.sseService.addEvent('merge-request', user.id, {
                    type: 'code',
                    data: { code, requestId: user.id },
                });
            } else {
                this.sseService.addEvent('merge-request', user.id, { type: 'code', data: { code } });
            }
        });

        return queue;
    }

    async deleteMergeRequest(user: User) {
        this.logger.log(`Force delete merge request by user id:${user.id}...`);

        this.sseService.closeQueue('merge-request', user.id);

        await this.mergeUserRequestModel.deleteOne({ mergedUserId: user.id });
    }

    async createAndMergeUsers(deviceRegistrationInfo: any, code: string) {
        const request = await this.mergeUserRequestModel.findOne({ code });

        if (!request || request.expiredDate.valueOf() < Date.now()) {
            throw new Error('NOT_VALID_CODE');
        }

        if (request.mergedFromDeviceId === deviceRegistrationInfo.deviceToken) {
            throw new Error('SAME_DEVICE');
        }

        const regInfo = await this.authService.registrationVirtual(deviceRegistrationInfo);

        console.log('regInfo:', regInfo);

        const user = await this.usersService.findOne(regInfo.username);

        try {
            const mergeInfo = await this.mergeUsers(user, code);

            return {
                ...mergeInfo,
                regInfo,
            };
        } catch (e) {
            this.logger.warn(`failed merge users. Remove temp virtual user id:${user.id}...`);
            await this.usersService.findByIdAndDelete(user.id);

            throw e;
        }
    }

    async mergeUsers(masterUser: User, code: string) {
        const request = await this.mergeUserRequestModel.findOneAndDelete({ code });

        if (!request || request.expiredDate.valueOf() < Date.now()) {
            throw new Error('NOT_VALID_CODE');
        }

        const fullMasterUser = await this.usersService.findOneById(masterUser.id);
        let mergedUser;

        if (!request.mergedUserIsTemp) {
            mergedUser = await this.usersService.findOneById(request.mergedUserId);

            if (!mergedUser) {
                throw new Error('NOT_EXIST_MERGED_USER');
            }
            if (mergedUser.id === masterUser.id) {
                throw new Error('SAME_USER');
            }
            this.logger.log(`Start merge request user id:${mergedUser.id} into user id:${masterUser.id}...`);

            // TODO Merge mergedUser into masterUser

            await this.devicesService.changeOwnerByUserId(mergedUser.id, masterUser.id);

            this.logger.log(`Done merge user id:${mergedUser.id} into user id:${masterUser.id}...`);

            await this.usersService.findByIdAndDelete(request.mergedUserId);
            this.logger.log(`Remove user id:${mergedUser.id}...`);
        } else {
            if (request.mergedUserId === masterUser.id) {
                throw new Error('SAME_USER');
            }

            if (masterUser.isTemp) {
            }

            mergedUser = {
                createDate: undefined,
                password: '',
                username: '',
                id: request.mergedUserId,
                isTemp: true,
                isVirtual: true,
            };
        }

        this.sseService.addEvent('merge-request', request.mergedUserId, {
            type: 'done-merge',
            data: {
                newUsername: fullMasterUser.username,
                newPassword: fullMasterUser.password,
            },
        });

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

            mergeRequestsRemove.forEach(({ mergedUserId }) => {
                this.sseService.closeQueue('merge-request', mergedUserId);
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
