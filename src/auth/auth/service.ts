import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '@/auth/users/service';
import { JwtService } from '@nestjs/jwt';
import { DevicesService } from '@/auth/devices/service';
import { Device, DEVICE_TYPE } from '@/auth/devices/entities/device';
import { ROLE, User } from '@/auth/users/entities/user';
import { RegistrationInfo } from '@/auth/auth/entities/registrationInfo';
import { LoginInfo } from '@/auth/auth/entities/loginInfo';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private devicesService: DevicesService,
        private jwtService: JwtService,
    ) {}

    async signDevice(userAgent: string, ip: string, type: DEVICE_TYPE, platform: string, user: User) {
        this.logger.log(`Sign device for user.id:${user.id}...`);

        if (!user) {
            this.logger.warn(`Not exist user.id:${user.id}. It is not possible to sign the device`);

            throw new BadRequestException(`Not exist user.id:${user.id}`);
        }

        return await this.devicesService.create(userAgent, ip, type, platform, user);
    }

    async signDeviceWithoutUser(userAgent: string, ip: string, type: DEVICE_TYPE, platform: string) {
        this.logger.log(`Create virtual user and sign device...`);

        const user = await this.usersService.createVirtual();

        const device = await this.devicesService.create(userAgent, ip, type, platform, user);

        return {
            user,
            device,
        };
    }

    async registrationUser(registrationInfo: RegistrationInfo) {
        return await this.usersService.create(registrationInfo.username, registrationInfo.password, ROLE.user);
    }

    async login(loginInfo: LoginInfo) {
        const device = await this.devicesService.findBySign(loginInfo.deviceSign);

        if (!device || device.holderUserId !== loginInfo.user.id) {
            throw new Error(`Not signed device for user.id:${loginInfo.user.id}`);
        }

        const accessToken = await this.getAccessToken(loginInfo.user, device);

        const payload = {
            tokenType: 'refreshToken',
            sub: loginInfo.user.id,
            username: loginInfo.user.username,
            deviceSub: device.id,
        };

        return {
            accessToken,
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }

    async verifyDevice(sign: string, user: User) {
        this.logger.log(`Verify device for user.id:${user.id}...`);

        if (!user) {
            this.logger.warn(`Not exist user.id:${user.id}. It is not possible to verify the device`);

            throw new BadRequestException(`Not exist user.id:${user.id}`);
        }

        const device = await this.devicesService.findBySign(sign);

        return device && device.holderUserId === user.id;
    }

    async getAccessToken(user: User, device: Device) {
        this.logger.log(`Renewal access token for user.id:${user.id} device.id:${device.id}...`);

        const payload = {
            tokenType: 'accessToken',
            username: user.username,
            sub: user.id,
            deviceSub: device.id,
        };

        return this.jwtService.sign(payload, { expiresIn: '10m' });
    }

    async getAuthToken(user: User, device: Device) {
        this.logger.log(`Get auth token for user.id:${user.id} device.id:${device.id}...`);

        const payload = {
            tokenType: 'authToken',
            username: user.username,
            sub: user.id,
            deviceSub: device.id,
        };

        return this.jwtService.sign(payload, {});
    }

    async checkIsExpired(jwtToken: string) {
        try {
            const { exp } = await this.jwtService.verify(jwtToken);

            return { expired: false, expiredTimeout: exp * 1000 - Date.now() };
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                return { expired: true, expiredTimeout: 0 };
            }

            throw e;
        }
    }

    async validateUser(username: string, password: string): Promise<User> {
        const user = await this.usersService.findByUsername(username);

        if (user && user.role !== ROLE.virtual_user && user.password === password) {
            const { password, ...result } = user;
            return result;
        }

        return null;
    }
}
