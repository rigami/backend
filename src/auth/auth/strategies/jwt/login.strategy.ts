import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../constants';
import { DevicesService } from '@/auth/devices/service';
import { UsersService } from '@/auth/users/service';
import { Credentials } from '@/auth/auth/entities/credentials';
import { ROLE } from '@/auth/users/entities/user';

@Injectable()
export class JwtLoginStrategy extends PassportStrategy(Strategy, 'jwt-login') {
    constructor(private deviceService: DevicesService, private userService: UsersService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: any): Promise<Credentials> {

        console.log('validate by jwt login strategy payload:', request.headers, payload)

        if (payload.tokenType !== 'authToken' || !request.headers['device-sign']) {
            throw new UnauthorizedException();
        }

        const user = await this.userService.findById(payload.sub);


        console.log('validate by jwt login strategy user:', user)

        if (!user || user.role !== ROLE.virtual_user) {
            throw new BadRequestException();
        }

        const device = await this.deviceService.findById(payload.deviceSub);

        console.log('validate by jwt login strategy device:', device)

        if (!device || device.holderUserId !== user.id || request.headers['device-sign'] !== device.sign) {
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
                sign: device.sign,
                platform: device.platform,
                isVerify: true,
            },
        };
    }
}
