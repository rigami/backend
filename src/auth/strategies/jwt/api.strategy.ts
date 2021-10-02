import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { DevicesService } from '@/devices/service';
import { UsersService } from '@/users/service';
import { Credentials } from '@/auth/entities/credentials';

@Injectable()
export class JwtDeviceStrategy extends PassportStrategy(Strategy, 'jwt-api') {
    constructor(
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
        if (payload.tokenHolder !== 'device' || payload.tokenType !== 'accessToken') {
            throw new UnauthorizedException();
        }

        const device = await this.deviceService.findOneById(payload.sub);
        const user = await this.userService.findOneById(payload.ownerSub);

        if (!device || !user || device.holderUserId !== user.id) {
            throw new UnauthorizedException();
        }

        return {
            user: {
                id: user.id,
                username: user.username,
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
