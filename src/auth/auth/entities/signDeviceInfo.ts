import { IsEnum, IsString } from 'class-validator';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

export class SignDeviceInfo {
    @IsString() readonly userAgent!: string;
    @IsEnum(DEVICE_TYPE) readonly deviceType!: string;
    @IsString() readonly ip!: string;
}
