import { Injectable, Logger } from '@nestjs/common';
import { Device } from './entities/device';
import { InjectModel } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/users/entities/user';

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

    constructor(
        @InjectModel(DeviceSchema)
        private readonly deviceModel: ReturnModelType<typeof DeviceSchema>,
    ) {}

    async findOneByTokenAndUser(token: string, userId: string): Promise<Device | null> {
        const device = await this.deviceModel.findOne({ token, holderUserId: userId });

        if (!device) return null;

        return {
            id: device.id,
            holderUserId: device.holderUserId,
            userAgent: device.userAgent,
            type: device.type,
            token: device.token,
            deviceSign: device.deviceSign,
            createDate: device.createDate,
        };
    }

    async findOneById(id: string): Promise<Device | null> {
        const device = await this.deviceModel.findOne({ id });

        if (!device) return null;

        return {
            id: device.id,
            holderUserId: device.holderUserId,
            userAgent: device.userAgent,
            type: device.type,
            token: device.token,
            deviceSign: device.deviceSign,
            createDate: device.createDate,
        };
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

    async createDevice(holderUser: User, device: Device): Promise<Device | null> {
        const deviceSign = UUIDv4();

        const createdDevice = await this.deviceModel.create({
            ...device,
            holderUserId: holderUser.id.toString(),
            deviceSign,
        });

        return {
            id: createdDevice.id,
            holderUserId: createdDevice.holderUserId,
            userAgent: createdDevice.userAgent,
            type: createdDevice.type,
            token: device.token,
            deviceSign: createdDevice.deviceSign,
            createDate: createdDevice.createDate,
        };
    }
}
