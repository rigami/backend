import { IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { DEVICE_TYPE } from '@/devices/entities/device';

export class AppHeaders {
    @Transform(({ value }) => value && value.toUpperCase().replace('-', '_'), { toClassOnly: true })
    @IsEnum(DEVICE_TYPE)
    'device-type': string;

    @IsUUID()
    'device-token': string;
}
