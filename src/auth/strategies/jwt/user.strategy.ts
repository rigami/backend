import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { AuthService } from '@/auth/service';
import { DevicesService } from '@/devices/service';
import { UsersService } from '@/users/service';

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

    async validate(payload: any) {
        console.log('validate user:', payload);

        const user = await this.userService.findOne(payload.username);

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            tokenHolder: payload.tokenHolder,
            userId: payload.sub,
            username: payload.username,
        };
    }
}
