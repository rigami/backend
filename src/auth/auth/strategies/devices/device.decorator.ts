import { SetMetadata } from '@nestjs/common';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

export const DEVICES_KEY = 'devices';
export const Devices = (...devices: DEVICE_TYPE[]) => SetMetadata(DEVICES_KEY, devices);
