import { Injectable } from '@nestjs/common';
import { UsersService } from '@/users/service';
import { JwtService } from '@nestjs/jwt';
import { InstanceInfo } from '@/auth/entities/instanceInfo';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { v4 as UUIDv4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersService.findOne(username);

        if (user && user.password === password) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async signDevice(instanceInfo: InstanceInfo) {
        const password = UUIDv4();

        const user = await this.usersService.createUser(instanceInfo.uuid, password);

        return {
            signDeviceToken: this.jwtService.sign({
                sub: user.id,
                deviceId: instanceInfo.uuid,
                serverSign: password,
            }),
        };
    }

    async registration(registrationInfo: RegistrationInfo) {
        const user = await this.usersService.createUser(registrationInfo.email, registrationInfo.password);

        return this.login(user);
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id };
        return {
            accessToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }
}
