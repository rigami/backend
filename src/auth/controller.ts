import { Body, Controller, Ip, Post, UseGuards, Headers, Get, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { JwtService } from '@nestjs/jwt';
import { Device } from '@/devices/entities/device';
import { JwtRefreshAuthGuard } from '@/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/utils/currentUser.param.decorator';
import { CurrentDevice } from '@/auth/utils/currentDevice.param.decorator';
import { User } from '@/users/entities/user';
import { RequestHeaders } from '@/auth/utils/validationHeaders.headers.decorator';
import { ExtractJwt } from 'passport-jwt';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private jwtService: JwtService) {}

    @Post('registration')
    async registration(@Body() registrationInfo: RegistrationInfo) {
        await this.authService.registration(registrationInfo);

        return;
    }

    @Post('virtual/registration')
    async registrationVirtual(@RequestHeaders() headers: Headers, @Ip() ip: string) {
        return this.authService.registrationVirtual({
            ip,
            userAgent: headers['user-agent'],
            deviceType: headers['device-type'],
            deviceToken: headers['device-token'],
        });
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@CurrentUser() user, @RequestHeaders() headers: Headers, @Ip() ip: string) {
        return this.authService.login({
            user,
            ip,
            userAgent: headers['user-agent'],
            deviceType: headers['device-type'],
            deviceToken: headers['device-token'],
        });
    }

    @UseGuards(JwtRefreshAuthGuard)
    @Get('token/refresh')
    async signDevice(@CurrentUser() user: User, @CurrentDevice() device: Device) {
        return this.authService.getAccessToken(user, device);
    }

    @Get('token/is-expired')
    async isExpired(@RequestHeaders() headers: Headers, @Req() request) {
        try {
            await this.jwtService.verify(ExtractJwt.fromAuthHeaderAsBearerToken()(request));
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                throw new UnauthorizedException();
            }

            throw e;
        }
    }
}
