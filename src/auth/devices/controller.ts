import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { User } from '@/auth/users/entities/user';
import { CurDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { Device } from '@/auth/devices/entities/device';
import { DevicesService } from '@/auth/devices/service';
import { DevicesResponseEntity } from '@/auth/devices/entities/response.devices';

@Controller('v1/devices')
export class DevicesController {
    constructor(private devicesService: DevicesService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('')
    async getAllDevices(@CurUser() user: User, @CurDevice() device: Device): Promise<DevicesResponseEntity> {
        const devices = await this.devicesService.getAllDevices(user);

        return {
            currentDevice: devices.find(({ id }) => device.id === id),
            otherDevices: devices.filter(({ id }) => device.id !== id),
        };
    }
}
