import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '@/users/service';
import { JwtService } from '@nestjs/jwt';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { DevicesService } from '@/devices/service';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { LoginInfo } from '@/auth/entities/loginInfo';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private devicesService: DevicesService,
        private jwtService: JwtService,
    ) {}

    async validateUser(email: string, password: string): Promise<User> {
        const user = await this.usersService.findOne(email);

        if (user && user.password === password) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async registration(registrationInfo: RegistrationInfo) {
        try {
            return await this.usersService.createUser(registrationInfo.email, registrationInfo.password);
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    async registrationVirtual(deviceRegistrationInfo: any) {
        try {
            const user = await this.usersService.createVirtualUser();

            const loginInfo = await this.login({
                user,
                ...deviceRegistrationInfo,
            });

            return {
                deviceToken: deviceRegistrationInfo.deviceToken,
                ...loginInfo,
            };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    async signDevice(user: User, device: Device) {
        this.logger.log(`Sign device for user id:${user.id}...`);

        if (!user) {
            this.logger.warn(`User id:${user.id} not exist. It is not possible to sign the device`);

            throw new BadRequestException(`User id:${user.id} not exist`);
        }

        return await this.devicesService.createDevice(user, device);
    }

    async getAccessToken(user: User, device: Device) {
        this.logger.log(`Renewal access token for user id:${user.id} on device id:${device.id}...`);

        const payload = {
            tokenType: 'accessToken',
            sub: user.id,
            username: user.email,
            deviceSub: device.id,
        };

        return { accessToken: this.jwtService.sign(payload, { expiresIn: '10m' }) };
    }

    async login(loginInfo: LoginInfo) {
        const device = await this.signDevice(loginInfo.user, {
            userAgent: loginInfo.userAgent,
            type: loginInfo.deviceType,
            token: loginInfo.deviceToken,
        });

        const accessToken = await this.getAccessToken(loginInfo.user, device);

        const payload = {
            tokenType: 'refreshToken',
            sub: loginInfo.user.id,
            username: loginInfo.user.email,
            deviceSub: device.id,
        };
        return {
            ...accessToken,
            refreshToken: this.jwtService.sign(payload, loginInfo.user.isVirtual ? {} : { expiresIn: '30d' }),
        };
    }
}
