import { Device } from '@/auth/devices/entities/device';

export class DevicesResponseEntity {
    readonly currentDevice: Device;

    readonly otherDevices: Device[];
}
