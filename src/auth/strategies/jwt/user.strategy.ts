import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { AuthService } from '@/auth/service';
import { DevicesService } from '@/devices/service';
import { UsersService } from '@/users/service';
import { Credentials } from '@/auth/entities/credentials';

@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, 'jwt-user') {
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
        if (payload.tokenHolder !== 'user' || payload.tokenType !== 'userKey') {
            throw new UnauthorizedException();
        }

        const user = await this.userService.findOne(payload.username);

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            user: {
                id: payload.sub,
                username: payload.username,
                isVirtual: user.isVirtual,
            },
        };
    }
}
