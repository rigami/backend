import { Injectable, Logger } from '@nestjs/common';
import { ROLE, User } from './entities/user';
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MergeUsersService {
    private readonly logger = new Logger(MergeUsersService.name);

    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private devicesService: DevicesService,
        private sseService: SSEService,
        private configService: ConfigService,
        @InjectModel(UserMergeRequestSchema)
        private readonly mergeUserRequestModel: ReturnModelType<typeof UserMergeRequestSchema>,
    ) {}

    async createMergeRequest(user: User, device: Device) {
        let request;
        const codeLifetime = this.configService.get<number>('mergeCodeLifetime');
        const code = generateMergeCode(6);
        const expiredDate = new Date(Date.now() + codeLifetime);

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

        return { code: request.code, expiredDate };
    }

    async createAndWatchMergeRequest(user: User, device: Device) {
        this.logger.log(`Create merge request by user id:${user.id} role:${user.role}...`);
        const codeLifetime = this.configService.get<number>('mergeCodeLifetime');

        const request = await this.createMergeRequest(user, device);

        this.sseService.closeQueue('merge-request', user.id);

        const queue = this.sseService.createQueue('merge-request', user.id);

        setTimeout(() => {
            try {
                this.sseService.addEvent('merge-request', user.id, {
                    type: 'code',
                    data: {
                        code: request.code,
                        maxExpiredTimeout: codeLifetime,
                        expiredTimeout: request.expiredDate.valueOf() - Date.now(),
                    },
                });
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

        if (applyUser.id === request.mergedUserId) {
            throw new Error('SAME_USER');
        }

        let masterUser;
        let masterDevice;
        let mergedUser;
        let mergedDevice;

        const requestedUser = await this.usersService.findById(request.mergedUserId);

        if (requestedUser.role !== ROLE.virtual_user && applyUser.role === ROLE.virtual_user) {
            // Login apply user by requested user credentials

            masterUser = await this.usersService.findById(request.mergedUserId);
            mergedUser = await this.usersService.findById(applyUser.id);

            mergedDevice = await this.devicesService.findById(deviceApplyUser.id);
            masterDevice = await this.devicesService.findById(request.mergedFromDeviceId);
        } else {
            // Merge request user to apply user and login requested user by apply user credentials

            masterUser = await this.usersService.findById(applyUser.id);
            mergedUser = await this.usersService.findById(request.mergedUserId);

            masterDevice = await this.devicesService.findById(deviceApplyUser.id);
            mergedDevice = await this.devicesService.findById(request.mergedFromDeviceId);
        }

        if (!mergedUser) {
            throw new Error('NOT_EXIST_MERGED_USER');
        }

        if (!masterUser) {
            throw new Error('NOT_EXIST_MASTER_USER');
        }

        this.logger.log(`Start merge request user id:${mergedUser.id} into user id:${masterUser.id}...`);

        // TODO Merge mergedUser into masterUser

        this.logger.log(`Change owner for all devices by user id:${mergedUser.id} to user id:${masterUser.id}...`);

        await this.devicesService.changeOwnerByUserId(mergedUser.id, masterUser.id);

        this.logger.log(`Done merge user id:${mergedUser.id} into user id:${masterUser.id}...`);

        await this.usersService.deleteById(mergedUser.id);
        this.logger.log(`Remove user id:${mergedUser.id}...`);

        mergedDevice = await this.devicesService.findById(mergedDevice.id);
        const authToken = await this.authService.getAuthToken(masterUser, mergedDevice);

        if (request.mergedUserId === mergedUser.id) {
            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: {
                    action: 'login/jwt',
                    authToken,
                },
            });

            return { action: 'confirm' };
        } else {
            this.sseService.addEvent('merge-request', request.mergedUserId, {
                type: 'done-merge',
                data: {
                    action: 'confirm',
                },
            });

            return {
                action: 'login/jwt',
                authToken,
            };
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
