import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    Ip,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { RegistrationInfo } from '@/auth/auth/entities/registrationInfo';
import { Device, DEVICE_TYPE } from '@/auth/devices/entities/device';
import { JwtLoginAuthGuard, JwtRefreshAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { CurrentDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { ROLE, User } from '@/auth/users/entities/user';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { ExtractJwt } from 'passport-jwt';
import { DevicesService } from '@/auth/devices/service';
import { Roles } from '@/auth/auth/strategies/roles/role.decorator';
import { RolesGuard } from '@/auth/auth/strategies/roles/roles.guard';
import { DevicesGuard } from '@/auth/auth/strategies/devices/device.guard';
import { Devices } from '@/auth/auth/strategies/devices/device.decorator';

@Controller('v1/auth')
export class AuthController {
    constructor(private authService: AuthService, private devicesService: DevicesService) {}

    @Post('virtual/sign-device')
    async signDevice(@RequestHeaders() headers: Headers, @Ip() ip: string): Promise<any> {
        const { device, user } = await this.authService.signDeviceWithoutUser(
            headers['user-agent'],
            ip,
            headers['device-type'],
            headers['device-platform'],
        );

        const authToken = await this.authService.getAuthToken(user, device);

        const loginData = await this.authService.login(user, device);

        return { authToken, ...loginData, deviceSign: device.sign };
    }

    @UseGuards(LocalAuthGuard, RolesGuard, DevicesGuard)
    @Post('user/sign-device')
    @Roles(ROLE.user)
    @Devices(DEVICE_TYPE.extension_chrome, DEVICE_TYPE.web)
    async signDeviceForUser(
        @RequestHeaders() headers: Headers,
        @Ip() ip: string,
        @CurrentUser() user: User,
    ): Promise<any> {
        const device = await this.authService.signDevice(
            headers['user-agent'],
            ip,
            headers['device-type'],
            headers['device-platform'],
            user,
        );

        return { deviceSign: device.sign };
    }

    @Post('registration')
    @HttpCode(200)
    async registration(@Body() registrationInfo: RegistrationInfo) {
        try {
            await this.authService.registrationUser(registrationInfo);
        } catch (e) {
            throw new BadRequestException(e.message);
        }

        return;
    }

    @UseGuards(LocalAuthGuard, RolesGuard, DevicesGuard)
    @Post('login/credentials')
    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @HttpCode(200)
    async loginByCredentials(
        @CurrentUser() user: User,
        @CurrentDevice() device: Device,
        @RequestHeaders() headers: Headers,
        @Ip() ip: string,
    ) {
        if (!device.isVerify) {
            device = await this.authService.signDevice(device.userAgent, ip, device.type, device.platform, user);
        } else {
            await this.devicesService.updateLastActivity(device, ip, headers['user-agent']);
        }

        const loginInfo = await this.authService.login(user, device);

        return {
            userId: user.id,
            username: user.username,
            ...loginInfo,
            isNewDevice: !device.isVerify,
            deviceSign: device.sign,
        };
    }

    @UseGuards(JwtLoginAuthGuard, RolesGuard, DevicesGuard)
    @Post('login/jwt')
    @Roles(ROLE.virtual_user)
    @Devices(DEVICE_TYPE.extension_chrome, DEVICE_TYPE.web)
    @HttpCode(200)
    async loginByJwt(
        @CurrentUser() user: User,
        @CurrentDevice() device: Device,
        @RequestHeaders() headers: Headers,
        @Ip() ip: string,
    ) {
        const isVerify = await this.authService.verifyDevice(device.sign, user);

        if (!isVerify) {
            throw new BadRequestException('Not signed device. First user/sign-device');
        } else {
            await this.devicesService.updateLastActivity(device, ip, headers['user-agent']);
        }

        return this.authService.login(user, device);
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Get('token/refresh')
    async refreshToken(@CurrentUser() user: User, @CurrentDevice() device: Device) {
        const accessToken = await this.authService.getAccessToken(user, device);
        const { expiredTimeout } = await this.authService.checkIsExpired(accessToken);

        return { accessToken, expiredTimeout };
    }

    @Get('token/expired-check')
    async isExpired(@RequestHeaders() headers: Headers, @Req() request) {
        return this.authService.checkIsExpired(ExtractJwt.fromAuthHeaderAsBearerToken()(request));
    }
}
