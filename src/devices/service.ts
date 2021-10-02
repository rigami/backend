import { Injectable, Logger } from '@nestjs/common';
import { Device } from './entities/device';
import { InjectModel } from 'nestjs-typegoose';
import { Device as DeviceScheme } from './schemas/device';
import { ReturnModelType } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/users/entities/user';

@Injectable()
export class DevicesService {
    private readonly logger = new Logger(DevicesService.name);

    constructor(
        @InjectModel(DeviceScheme)
        private readonly deviceModel: ReturnModelType<typeof DeviceScheme>,
    ) {
        deviceModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop devices! Because set development mode');
        });
    }

    async findOneById(id: string): Promise<Device | null> {
        const device = await this.deviceModel.findById(id);

        if (!device) return null;

        return {
            id: device.id,
            holderUserId: device.holderUserId,
            userAgent: device.userAgent,
            type: device.type,
            deviceSign: device.deviceSign,
            createDate: device.createDate,
        };
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
            deviceSign: createdDevice.deviceSign,
            createDate: createdDevice.createDate,
        };
    }
}
