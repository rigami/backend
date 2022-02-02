import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../service';
import { Credentials } from '@/auth/auth/entities/credentials';
import { ROLE } from '@/auth/users/entities/user';
import { DevicesService } from '@/auth/devices/service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService, private deviceService: DevicesService) {
        super({
            passReqToCallback: true,
        });
    }

    async validate(request: Request, username: string, password: string): Promise<Credentials> {
        const user = await this.authService.validateUser(username, password);

        if (!user) {
            throw new UnauthorizedException();
        }

        if (user.role === ROLE.virtual_user) {
            throw new BadRequestException();
        }

        const isVerifyDevice =
            !!request.headers['device-sign'] &&
            (await this.authService.verifyDevice(request.headers['device-sign'], user));

        let device;

        if (isVerifyDevice) {
            device = await this.deviceService.findBySign(request.headers['device-sign']);
        }

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
            device: {
                id: device?.id,
                userAgent: device?.userAgent || request.headers['user-agent'],
                type: device?.type || request.headers['device-type'],
                sign: device?.sign || request.headers['device-sign'],
                platform: device?.platform || request.headers['device-platform'],
                isVerify: isVerifyDevice,
            },
        };
    }
}
