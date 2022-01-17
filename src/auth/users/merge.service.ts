import { Injectable, Logger } from '@nestjs/common';
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
            } /* if (
                err.name === 'MongoServerError' &&
                err.code === 11000 &&
                'mergedFromDeviceId' in err.keyPattern
            ) {
                // erg
            } else */ else {
                this.logger.error(err);
                throw err;
            }
        }

        return { code: request.code };
    }

    async createAndWatchMergeRequest(user: User, device: Device) {
        this.logger.log(`Create merge request by user id:${user.id} isTemp:${user.isTemp}...`);

        const request = await this.createMergeRequest(user, device);

        const queue = this.sseService.createQueue('merge-request', user.id);

        setTimeout(() => {
            try {
                if (user.isTemp) {
                    this.sseService.addEvent('merge-request', user.id, {
                        type: 'code',
                        data: { code: request.code, requestId: user.id },
                    });
                } else {
                    this.sseService.addEvent('merge-request', user.id, { type: 'code', data: { code: request.code } });
                }
            } catch (e) {
                this.sseService.closeQueue('merge-request', user.id);
            }
        });

        return queue;
    }

    async deleteMergeRequest(user: User) {
        this.logger.log(`Force delete merge request by user id:${user.id}...`);

        this.sseService.closeQueue('merge-request', user.id);

        await this.mergeUserRequestModel.deleteOne({ mergedUserId: user.id });
    }

    async mergeUsers(code: string, applyUser: User, deviceApplyUser: Device) {
        const request = await this.mergeUserRequestModel.findOneAndDelete({ code });

        if (!request || request.expiredDate.valueOf() < Date.now()) {
            throw new Error('NOT_VALID_CODE');
        }

        if (request.mergedFromDeviceId === deviceApplyUser.id) {
            throw new Error('SAME_DEVICE');
        }

        if (request.mergedUserIsTemp && applyUser.isTemp) {
            // Create virtual user and login both devices

            const user = await this.usersService.createVirtual();

            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: {
                    action: 'login',
                    newUsername: user.username,
                    newPassword: user.password,
                },
            });
            return {
                action: 'login',
                newUsername: user.username,
                newPassword: user.password,
            };
        } else if (request.mergedUserIsTemp && !applyUser.isTemp) {
            // Login request user by apply user credentials

            const user = await this.usersService.findById(applyUser.id);

            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: {
                    action: 'login',
                    newUsername: user.username,
                    newPassword: user.password,
                },
            });
            return { action: 'confirm' };
        } else if (!request.mergedUserIsTemp && applyUser.isTemp) {
            // Login apply user by request user credentials

            const user = await this.usersService.findById(request.mergedUserId);

            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: { action: 'confirm' },
            });
            return {
                action: 'login',
                newUsername: user.username,
                newPassword: user.password,
            };
        } else {
            // Merge request user to apply user and login request user by apply user credentials

            if (applyUser.id === request.mergedUserId) {
                throw new Error('SAME_USER');
            }

            const masterUser = await this.usersService.findById(applyUser.id);
            const mergedUser = await this.usersService.findById(request.mergedUserId);

            if (!mergedUser) {
                throw new Error('NOT_EXIST_MERGED_USER');
            }

            this.logger.log(`Start merge request user id:${mergedUser.id} into user id:${masterUser.id}...`);

            // TODO Merge mergedUser into masterUser

            await this.devicesService.changeOwnerByUserId(mergedUser.id, masterUser.id);

            this.logger.log(`Done merge user id:${mergedUser.id} into user id:${masterUser.id}...`);

            await this.usersService.deleteById(request.mergedUserId);
            this.logger.log(`Remove user id:${mergedUser.id}...`);

            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: {
                    action: 'login',
                    newUsername: masterUser.username,
                    newPassword: masterUser.password,
                },
            });

            return { action: 'confirm' };
        }
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
