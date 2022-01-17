import {
    Body,
    Controller,
    Ip,
    Post,
    UseGuards,
    Headers,
    Get,
    Req,
    HttpCode,
    BadRequestException,
    UnauthorizedException, ForbiddenException,
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

        return { authToken };
    }

    @UseGuards(LocalAuthGuard)
    @Post('user/sign-device')
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

    @UseGuards(LocalAuthGuard)
    @Post('login/credentials')
    @HttpCode(200)
    async loginByCredentials(@CurrentUser() user: User, @RequestHeaders() headers: Headers, @Ip() ip: string) {
        if (headers['device-type'] === DEVICE_TYPE.CONSOLE && user.role !== ROLE.moderator) {
            throw new ForbiddenException();
        }

        const isVerify = headers['device-sign'] && (await this.authService.verifyDevice(headers['device-sign'], user));

        let device;

        if (!isVerify) {
            device = await this.authService.signDevice(
                headers['user-agent'],
                ip,
                headers['device-type'],
                headers['device-platform'],
                user,
            );
        } else {
            device = await this.devicesService.findBySign(headers['device-sign']);
        }

        const loginInfo = await this.authService.login({
            user,
            ip,
            userAgent: headers['user-agent'],
            deviceType: headers['device-type'],
            deviceSign: device.sign,
            devicePlatform: headers['device-platform'],
        });

        return {
            userId: user.id,
            username: user.username,
            ...loginInfo,
            isNewDevice: !isVerify,
            deviceSign: device.sign,
        };
    }

    @UseGuards(JwtLoginAuthGuard)
    @Post('login/jwt')
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
        }

        return this.authService.login({
            user,
            ip,
            userAgent: headers['user-agent'],
            deviceType: headers['device-type'],
            devicePlatform: headers['device-platform'],
            deviceSign: device.sign,
        });
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
