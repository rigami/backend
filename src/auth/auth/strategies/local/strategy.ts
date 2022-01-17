import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../service';
import { Credentials } from '@/auth/auth/entities/credentials';
import { ROLE } from '@/auth/users/entities/user';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super();
    }

    async validate(username: string, password: string): Promise<Credentials> {
        const user = await this.authService.validateUser(username, password);

        if (!user) {
            throw new UnauthorizedException();
        }

        if (user.role === ROLE.virtual_user) {
            throw new BadRequestException();
        }

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
            },
        };
    }
}
