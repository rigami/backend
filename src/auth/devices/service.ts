import { Injectable, Logger } from '@nestjs/common';
import { Device, DEVICE_TYPE } from './entities/device';
import { InjectModel } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/auth/users/entities/user';
import { plainToClass } from 'class-transformer';
import base64url from 'base64url';

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

    constructor(
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
            platform: device.platform,
            createDate: device.createDate,
            lastActivityDate: device.lastActivityDate,
            lastActivityIp: device.lastActivityIp,
        };
    }

    async deleteAllByUserId(userId: string) {
        const statistics = await this.deviceModel.deleteMany({ holderUserId: userId });

        this.logger.log(`Deleted all ${statistics.deletedCount} devices by user id:${userId}...`);
    }

    async updateLastActivity(device: Device, ip?: string, userAgent?: string) {
        await this.deviceModel.updateOne(
            { id: device.id },
            {
                $set: {
                    lastActivityDate: new Date(),
                    lastActivityIp: ip || device.lastActivityIp,
                    userAgent: userAgent || device.userAgent,
                },
            },
        );
    }

    async getAllDevices(user: User): Promise<Device[]> {
        const devices = await this.deviceModel.find({ holderUserId: user.id }).lean().exec();

        console.log('devices:', devices);

        return devices.map((device) => plainToClass(Device, device, { excludeExtraneousValues: true }));
    }

    async changeOwnerByUserId(oldUserId: string, newUserId: string): Promise<void> {
        const statistics = await this.deviceModel.updateMany(
            { holderUserId: oldUserId },
            { $set: { holderUserId: newUserId } },
        );

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
        const deviceSign = base64url(
            JSON.stringify({
                platform,
                holderSub: holderUser.id,
                type,
                salt: UUIDv4(),
                timestamp: Date.now(),
            }),
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
            platform: createdDevice.platform,
            createDate: createdDevice.createDate,
            lastActivityDate: createdDevice.lastActivityDate,
            lastActivityIp: createdDevice.lastActivityIp,
        };
    }
}
