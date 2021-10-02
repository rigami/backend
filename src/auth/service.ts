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

    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersService.findOne(username);

        if (user && user.password === password) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async validateDevice(id: string, deviceSign: string): Promise<any> {
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

    async signDevice(userId: string, device: Device) {
        this.logger.log(`Sign device for user id:${userId}...`);
        const user = await this.usersService.findOneById(userId);

        if (!user) {
            this.logger.warn(`User id:${userId} not exist. It is not possible to sign the device`);

            throw new BadRequestException(`User id:${userId} not exist`);
        }

        const signedDevice = await this.devicesService.createDevice(user, device);

        const token = await this.renewalDeviceSignature(userId, signedDevice.id);

        const payload = {
            tokenHolder: 'device',
            tokenType: 'deviceKey',
            sub: signedDevice.id,
            ownerSub: user.id,
            ownerUsername: user.username,
            deviceSign: signedDevice.deviceSign,
        };

        return {
            ...token,
            deviceKey: this.jwtService.sign(payload),
        };
    }

    async renewalDeviceSignature(userId: string, deviceId: string) {
        this.logger.log(`Renewal device id:${deviceId} signature by user id:${userId}...`);

        const signedDevice = await this.devicesService.findOneById(deviceId);

        if (!signedDevice || userId !== signedDevice.holderUserId) {
            throw new UnauthorizedException('DEVICE_NOT_EXIST');
        }

        const user = await this.usersService.findOneById(signedDevice.holderUserId);

        if (!user || !signedDevice) {
            throw new UnauthorizedException('DEVICE_NOT_SIGNED');
        }

        const payload = {
            tokenHolder: 'device',
            tokenType: 'accessToken',
            sub: signedDevice.id,
            ownerSub: user.id,
            ownerUsername: user.username,
        };

        return { accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }) };
    }

    async login(user: any) {
        const payload = {
            tokenHolder: 'user',
            tokenType: 'userKey',
            sub: user.id,
            username: user.username,
        };
        return { userKey: this.jwtService.sign(payload, { expiresIn: '30d' }) };
    }
}
