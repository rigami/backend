import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '@/auth/users/service';
import { JwtService } from '@nestjs/jwt';
import { RegistrationInfo } from '@/auth/auth/entities/registrationInfo';
import { DevicesService } from '@/auth/devices/service';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { LoginInfo } from '@/auth/auth/entities/loginInfo';

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

        if (user && user.isVirtual) {
            const { password, ...result } = user;
            return result;
        }

        if (user && !user.isVirtual && user.password === password) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async registration(registrationInfo: RegistrationInfo) {
        try {
            const user = await this.usersService.createUser(registrationInfo.email, registrationInfo.password);

            const loginInfo = await this.login({
                user,
                ...registrationInfo,
            });

            return {
                username: user.email,
                deviceToken: registrationInfo.deviceToken,
                ...loginInfo,
            };
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
                username: user.email,
                deviceToken: deviceRegistrationInfo.deviceToken,
                ...loginInfo,
            };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    async verifyDevice(user: User, device: Device) {
        this.logger.log(`Verify device for user.id:${user.id}...`);

        if (!user) {
            this.logger.warn(`Not exist user.id:${user.id}. It is not possible to verify the device`);

            throw new BadRequestException(`Not exist user.id:${user.id}`);
        }

        return await this.devicesService.findOneByTokenAndUser(device.token, user.id);
    }

    async signDevice(user: User, device: Device) {
        this.logger.log(`Sign device for user.id:${user.id}...`);

        if (!user) {
            this.logger.warn(`Not exist user.id:${user.id}. It is not possible to sign the device`);

            throw new BadRequestException(`Not exist user.id:${user.id}`);
        }

        return await this.devicesService.createDevice(user, device);
    }

    async getAccessToken(user: User, device: Device) {
        this.logger.log(`Renewal access token for user.id:${user.id} device.id:${device.id}...`);

        const payload = {
            tokenType: 'accessToken',
            sub: user.id,
            username: user.email,
            deviceSub: device.id,
        };

        return { accessToken: this.jwtService.sign(payload, { expiresIn: '10m' }) };
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

    async login(loginInfo: LoginInfo) {
        let device = await this.verifyDevice(loginInfo.user, {
            userAgent: loginInfo.userAgent,
            type: loginInfo.deviceType,
            token: loginInfo.deviceToken,
        });

        if (!device) {
            this.logger.log(`Not verify device for user.id:${loginInfo.user.id}...`);
            device = await this.signDevice(loginInfo.user, {
                userAgent: loginInfo.userAgent,
                type: loginInfo.deviceType,
                token: loginInfo.deviceToken,
            });
        }

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
