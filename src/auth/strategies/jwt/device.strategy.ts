import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { AuthService } from '@/auth/service';
import { DevicesService } from '@/devices/service';
import { UsersService } from '@/users/service';

@Injectable()
export class JwtDeviceStrategy extends PassportStrategy(Strategy, 'jwt-device') {
    constructor(
        private authService: AuthService,
        private deviceService: DevicesService,
        private userService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    async validate(payload: any) {
        console.log('validate device:', payload);

        if (payload.tokenHolder !== 'device') {
            throw new UnauthorizedException();
        }

        const device = await this.authService.validateDevice(payload.sub);

        if (!device) {
            throw new UnauthorizedException();
        }

        console.log('device:', device)

        return {
            tokenHolder: payload.tokenHolder,
            userId: device.user.id,
            username: device.user.username,
            deviceId: device.id,
            deviceType: device.type,
        };
    }
}
