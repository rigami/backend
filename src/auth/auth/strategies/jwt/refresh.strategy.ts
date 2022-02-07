import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { DevicesService } from '@/auth/devices/service';
import { UsersService } from '@/auth/users/service';
import { Credentials } from '@/auth/auth/entities/credentials';
import { STATUS } from '@/auth/utils/status.enum';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private deviceService: DevicesService, private userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: any): Promise<Credentials> {
        if (payload.tokenType !== 'refreshToken' || !request.headers['device-sign']) {
            throw new UnauthorizedException();
        }

        const user = await this.userService.findById(payload.sub);
        const device = await this.deviceService.findById(payload.deviceSub);

        if (!user || !device || device.holderUserId !== user.id) {
            throw new UnauthorizedException();
        }

        if (user.status !== STATUS.active || device.status !== STATUS.active) {
            throw new UnauthorizedException();
        }

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
            },
            device: {
                id: device.id,
                userAgent: device.userAgent,
                type: device.type,
                sign: device.sign,
                status: device.status,
                platform: device.platform,
                isVerify: true,
            },
        };
    }
}
