import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/service';
import { JwtService } from '@nestjs/jwt';
import { RegistrationInfo } from '@/auth/entities/registrationInfo';
import { DevicesService } from '@/devices/service';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';

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

    async validateDevice(id: string, deviceSign: string): Promise<Device> {
        const device = await this.devicesService.findOneById(id);

        if (!device) {
            return null;
        }

        const user = await this.usersService.findOneById(device.holderUserId);

        if (user && device && device.deviceSign === deviceSign) {
            const { deviceSign, ...deviceSafe } = device;

            return deviceSafe;
        }

        return null;
    }

    async registration(registrationInfo: RegistrationInfo) {
        try {
            const user = await this.usersService.createUser(registrationInfo.email, registrationInfo.password);

            return this.login(user);
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    async registrationVirtual() {
        try {
            const user = await this.usersService.createVirtualUser();

            return this.login(user);
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

        const signedDevice = await this.devicesService.createDevice(user, device);

        const token = await this.renewalDeviceSignature(user, signedDevice);

        const payload = {
            tokenHolder: 'device',
            tokenType: 'deviceKey',
            sub: signedDevice.id,
            ownerSub: user.id,
            ownerUsername: user.email,
            deviceSign: signedDevice.deviceSign,
        };

        return {
            ...token,
            deviceKey: this.jwtService.sign(payload),
        };
    }

    async renewalDeviceSignature(user: User, device: Device) {
        this.logger.log(`Renewal device id:${device.id} signature by user id:${user.id}...`);

        if (user.id !== device.holderUserId) {
            throw new UnauthorizedException('DEVICE_NOT_EXIST');
        }

        const payload = {
            tokenHolder: 'device',
            tokenType: 'accessToken',
            sub: device.id,
            ownerSub: user.id,
            ownerUsername: user.email,
        };

        return { accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }) };
    }

    async login(user: User) {
        const payload = {
            tokenHolder: 'user',
            tokenType: 'userKey',
            sub: user.id,
            username: user.email,
        };
        return { userKey: this.jwtService.sign(payload, { expiresIn: '30d' }) };
    }
}
