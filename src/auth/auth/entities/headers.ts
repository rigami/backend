import { IsEnum, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

export class AppHeaders {
    @Transform(({ value }) => value && value.replace('-', '_'), { toClassOnly: true })
    @IsEnum(DEVICE_TYPE)
    'device-type': string;

    @IsString()
    'device-sign': string;

    @IsString()
    'device-platform': string;
}
