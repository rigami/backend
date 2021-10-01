import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { JwtService } from '@nestjs/jwt';
import { Device } from '@/devices/entities/device';
import { JwtUserAuthGuard } from '@/auth/strategies/jwt/auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private jwtService: JwtService) {}

    @Post('registration')
    async registration(@Body() registrationInfo: RegistrationInfo) {
        return this.authService.registration(registrationInfo);
    }

    @UseGuards(JwtUserAuthGuard)
    @Post('device/sign')
    async signDevice(@Body() device: Device, @Request() req) {
        return this.authService.signDevice(req.user.userId, { ...device, holderUserId: req.user.userId });
    }

    @UseGuards(JwtUserAuthGuard)
    @Post('device/:deviceId/renewal')
    async renewalDeviceSignature(@Param() params, @Request() req) {
        return this.authService.renewalDeviceSignature(req.user.userId, params.deviceId);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }
}
