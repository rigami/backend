import {
    BadRequestException,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Logger,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { User } from '@/auth/users/entities/user';
import { CurDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { Device } from '@/auth/devices/entities/device';
import { DevicesService } from '@/auth/devices/service';
import { DevicesResponseEntity } from '@/auth/devices/entities/response.devices';
import { UsersService } from '@/auth/users/service';

@Controller('v1/devices')
export class DevicesController {
    private readonly logger = new Logger(DevicesController.name);

    constructor(private devicesService: DevicesService, private usersService: UsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('')
    async getAllDevices(@CurUser() user: User, @CurDevice() device: Device): Promise<DevicesResponseEntity> {
        const devices = await this.devicesService.getAllDevices(user);

        return {
            currentDevice: devices.find(({ id }) => device.id === id),
            otherDevices: devices.filter(({ id }) => device.id !== id),
        };
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete(':id')
    async deleteDevice(@Param('id') id: string, @CurUser() user: User): Promise<void> {
        const deletedDevice = await this.devicesService.findById(id);

        if (!deletedDevice) {
            throw new BadRequestException();
        }

        if (deletedDevice.holderUserId !== user.id) {
            throw new ForbiddenException();
        }

        const devices = await this.devicesService.getAllDevices(user);

        if (devices.length === 1) {
            this.logger.log(`Delete device id:${deletedDevice.id} and user id:${user.id}...`);
            await this.usersService.deleteById(user.id);
        } else {
            this.logger.log(`Delete device id:${deletedDevice.id} of user id:${user.id}...`);
            await this.devicesService.deleteById(deletedDevice.id);
        }
    }
}
