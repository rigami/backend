import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { DevicesService } from '@/auth/devices/service';
import { UsersService } from '@/auth/users/service';
import { Credentials } from '@/auth/auth/entities/credentials';

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
        if (payload.tokenType !== 'refreshToken') {
            throw new UnauthorizedException();
        }

        const user = await this.userService.findOneById(payload.sub);
        const device = await this.deviceService.findOneById(payload.deviceSub);

        if (!user || !device || device.holderUserId !== user.id || request.headers['device-token'] !== device.token) {
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
