import { Injectable, Logger } from '@nestjs/common';
import { Device, DEVICE_TYPE } from './entities/device';
import { InjectModel } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/auth/users/entities/user';
import { plainToClass } from 'class-transformer';
import base64url from 'base64url';
import { STATUS } from '@/auth/utils/status.enum';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

    constructor(
        private jwtService: JwtService,
        @InjectModel(DeviceSchema)
        private readonly deviceModel: ReturnModelType<typeof DeviceSchema>,
    ) {}

    async findById(deviceId: string): Promise<Device | null> {
        const device = await this.deviceModel.findOne({ id: deviceId });

        if (!device) return null;

        return {
            id: device.id,
            holderUserId: device.holderUserId,
            userAgent: device.userAgent,
            type: device.type,
            sign: device.sign,
            status: device.status,
            statusChangeDate: device.statusChangeDate,
            platform: device.platform,
            createDate: device.createDate,
            lastActivityDate: device.lastActivityDate,
            lastActivityIp: device.lastActivityIp,
        };
    }

    async findBySign(sign: string): Promise<Device | null> {
        const device = await this.deviceModel.findOne({ sign });

        if (!device) return null;

        return {
            id: device.id,
            holderUserId: device.holderUserId,
            userAgent: device.userAgent,
            type: device.type,
            sign: device.sign,
            status: device.status,
            statusChangeDate: device.statusChangeDate,
            platform: device.platform,
            createDate: device.createDate,
            lastActivityDate: device.lastActivityDate,
            lastActivityIp: device.lastActivityIp,
        };
    }

    async deleteAllByUserId(userId: string) {
        const statistics = await this.deviceModel.updateMany(
            { holderUserId: userId },
            { $set: { status: STATUS.deleted, statusChangeDate: new Date() } },
        );

        this.logger.log(`Deleted all ${statistics.modifiedCount} devices by user id:${userId}...`);
    }

    async deleteById(deviceId: string) {
        await this.deviceModel.updateOne(
            { id: deviceId },
            { $set: { status: STATUS.deleted, statusChangeDate: new Date() } },
        );
    }

    async updateLastActivity(device: Device, ip?: string, userAgent?: string) {
        await this.deviceModel.updateMany(
            { id: device.id },
            [
                {
                    $set: {
                        lastActivityDate: new Date(),
                        lastActivityIp: ip || device.lastActivityIp,
                        userAgent: userAgent || device.userAgent,
                        status: STATUS.active,
                        statusChangeDate: {
                            $cond: {
                                if: { $eq: ['$status', STATUS.active] },
                                then: '$statusChangeDate',
                                else: new Date(),
                            },
                        },
                    },
                },
            ],
            { multi: true },
        );
    }

    async getAllDevices(user: User, status: STATUS = STATUS.active): Promise<Device[]> {
        const devices = await this.deviceModel.find({ holderUserId: user.id, status }).lean().exec();

        return devices.map((device) => plainToClass(Device, device, { excludeExtraneousValues: true }));
    }

    async changeOwnerByUserId(oldUserId: string, newUserId: string, setStatus: STATUS): Promise<void> {
        const updateValue: any = { holderUserId: newUserId };

        if (setStatus) {
            updateValue.status = setStatus;
        }

        const statistics = await this.deviceModel.updateMany({ holderUserId: oldUserId }, { $set: updateValue });

        this.logger.log(
            `Change owner user id:${oldUserId} to user id:${newUserId} for ${statistics.modifiedCount} devices...`,
        );
    }

    async create(
        userAgent: string,
        ip: string,
        type: DEVICE_TYPE,
        platform: string,
        holderUser?: User,
    ): Promise<Device | null> {
        const deviceSign = this.jwtService.sign(
            {
                tokenType: 'deviceSign',
                platform,
                holderSub: holderUser.id,
                type,
                salt: UUIDv4(),
                timestamp: Date.now(),
            },
            {},
        );

        const createdDevice = await this.deviceModel.create({
            userAgent,
            lastActivityIp: ip,
            type,
            sign: deviceSign,
            platform,
            holderUserId: holderUser ? holderUser.id.toString() : null,
        });

        return {
            id: createdDevice.id,
            holderUserId: createdDevice.holderUserId,
            userAgent: createdDevice.userAgent,
            type: createdDevice.type,
            sign: createdDevice.sign,
            status: createdDevice.status,
            statusChangeDate: createdDevice.statusChangeDate,
            platform: createdDevice.platform,
            createDate: createdDevice.createDate,
            lastActivityDate: createdDevice.lastActivityDate,
            lastActivityIp: createdDevice.lastActivityIp,
        };
    }
}
