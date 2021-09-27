import { Injectable } from '@nestjs/common';
import { UsersService } from '@/users/service';
import { JwtService } from '@nestjs/jwt';
import { InstanceInfo } from '@/auth/entities/instanceInfo';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { v4 as UUIDv4 } from 'uuid';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(username);
        if (user && user.password === pass) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async signDevice(instanceInfo: InstanceInfo) {
        console.log('Sign device:', instanceInfo);

        const password = UUIDv4();

        console.log('assign instance:', instanceInfo, password);

        const user = await this.usersService.createUser(instanceInfo.uuid, password);

        return {
            login: instanceInfo.uuid,
            password: password,
        };
    }

    async registration(registrationInfo: RegistrationInfo) {
        console.log('registration user:', registrationInfo);
    }

    async login(user: any) {
        console.log('user:', user);

        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
