import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { JwtAuthGuard } from './strategies/jwt/auth.guard';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { InstanceInfo } from '@/auth/entities/instanceInfo';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('sign-device')
    async signDevice(@Body() instanceInfo: InstanceInfo) {
        return this.authService.signDevice(instanceInfo);
    }

    @Post('registration')
    async registration(@Body() registrationInfo: RegistrationInfo) {
        return this.authService.registration(registrationInfo);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
