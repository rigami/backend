import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { JwtService } from '@nestjs/jwt';
import { Device } from '@/devices/entities/device';
import { JwtDeviceAuthGuard, JwtUserAuthGuard } from '@/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/utils/currentUser.param.decorator';
import { CurrentDevice } from '@/auth/utils/currentDevice.param.decorator';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private jwtService: JwtService) {}

    @Post('registration')
    async registration(@Body() registrationInfo: RegistrationInfo) {
        return this.authService.registration(registrationInfo);
    }

    @Post('virtual/registration')
    async registrationVirtual() {
        return this.authService.registrationVirtual();
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@CurrentUser() user) {
        return this.authService.login(user);
    }

    @UseGuards(JwtUserAuthGuard)
    @Post('device/sign')
    async signDevice(@CurrentUser() user, @Body() device: Device) {
        return this.authService.signDevice(user, { ...device, holderUserId: user.id });
    }

    @UseGuards(JwtDeviceAuthGuard)
    @Post('device/renewal')
    async renewalDeviceSignature(@CurrentUser() user, @CurrentDevice() device) {
        return this.authService.renewalDeviceSignature(user, device);
    }
}
