import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { AuthService } from '@/auth/service';
import { DevicesService } from '@/devices/service';
import { UsersService } from '@/users/service';
import { Credentials } from '@/auth/entities/credentials';

@Injectable()
export class JwtDeviceRenewalStrategy extends PassportStrategy(Strategy, 'jwt-device') {
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

    async validate(payload: any): Promise<Credentials> {
        if (payload.tokenHolder !== 'device' || payload.tokenType !== 'deviceKey') {
            throw new UnauthorizedException();
        }

        const device = await this.authService.validateDevice(payload.sub, payload.deviceSign);
        const user = await this.userService.findOneById(payload.ownerSub);

        if (!device || !user || device.holderUserId !== user.id) {
            throw new UnauthorizedException();
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                isVirtual: user.isVirtual,
            },
            device: {
                id: device.id,
                userAgent: device.userAgent,
                type: device.type,
            },
        };
    }
}
