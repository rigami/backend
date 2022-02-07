import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '@/auth/users/service';
import { JwtService } from '@nestjs/jwt';
import { DevicesService } from '@/auth/devices/service';
import { Device, DEVICE_TYPE } from '@/auth/devices/entities/device';
import { ROLE, User } from '@/auth/users/entities/user';
import { RegistrationInfo } from '@/auth/auth/entities/registrationInfo';
import { STATUS } from '@/auth/utils/status.enum';

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

        if (!user || user.status !== STATUS.active) {
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

    async login(user: User, device: Device) {
        device = device && (await this.devicesService.findById(device.id));

        if (!device || !user || device.holderUserId !== user.id) {
            throw new Error(`Not signed device for user.id:${user.id}`);
        }

        if (user.status !== STATUS.active && user.status !== STATUS.inactive) {
            throw new Error(`Not active user.id:${user.id}`);
        }

        if (device.status !== STATUS.active && device.status !== STATUS.inactive) {
            throw new Error(`Not active device.id:${device.id}`);
        }

        const accessToken = await this.getAccessToken(user, device);

        const payload = {
            tokenType: 'refreshToken',
            sub: user.id,
            username: user.username,
            deviceSub: device.id,
        };

        return {
            accessToken,
            refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
        };
    }

    async verifyDevice(sign: string, user: User): Promise<boolean> {
        this.logger.log(`Verify device for user.id:${user.id}...`);

        if (!user || user.status !== STATUS.active) {
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

    async check(jwtToken: string) {
        let parsed: any;

        try {
            parsed = await this.jwtService.decode(jwtToken);
        } catch (e) {
            return { status: 'token-broken' };
        }

        const user = await this.usersService.findById(parsed.sub);
        const device = await this.devicesService.findById(parsed.deviceSub);

        if (!user) {
            return { status: 'user-not-exist' };
        }

        if (!device) {
            return {
                status: 'device-not-exist',
                recommendedAction: 'registration',
                path: 'v1/auth/virtual/sign-device',
            };
        }

        if (device.status === STATUS.inactive && device.holderUserId !== parsed.deviceSub) {
            const authToken = await this.getAuthToken(user, device);

            return { status: `device-${device.status}`, action: 'login/jwt', authToken };
        }

        if (device.status !== STATUS.active) {
            return { status: `device-${device.status}` };
        }

        if (user.status !== STATUS.active) {
            return { status: `user-${user.status}` };
        }

        try {
            await this.jwtService.verify(jwtToken);

            return { status: 'active' };
        } catch (e) {
            if (e.name === 'TokenExpiredError') {
                return { status: 'token-expired' };
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
