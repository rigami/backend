import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './service';
import { LocalAuthGuard } from './strategies/local/auth.guard';
import { JwtAuthGuard } from './strategies/jwt/auth.guard';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { InstanceInfo } from '@/auth/entities/instanceInfo';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService, private jwtService: JwtService) {}

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

    // @UseGuards(LocalAuthGuard)
    @Post('access-token-device')
    async accessTokenDevice(@Query() query) {
        console.log('tokenDevice:', query.tokenDevice, this.jwtService.decode(query.tokenDevice));
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
