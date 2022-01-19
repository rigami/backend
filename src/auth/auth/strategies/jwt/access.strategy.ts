import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { DevicesService } from '@/auth/devices/service';
import { UsersService } from '@/auth/users/service';
import { Credentials } from '@/auth/auth/entities/credentials';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
    constructor(private deviceService: DevicesService, private userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: any): Promise<Credentials> {
        if (payload.tokenType !== 'accessToken') {
            throw new UnauthorizedException();
        }

        const user = await this.userService.findById(payload.sub);
        const device = await this.deviceService.findById(payload.deviceSub);

        if (!user || !device || device.holderUserId !== user.id) {
            throw new UnauthorizedException();
        }

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            device: {
                id: device.id,
                userAgent: device.userAgent,
                type: device.type,
                platform: device.platform,
                isVerify: true,
            },
        };
    }
}
