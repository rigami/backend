import { IsEnum, IsString, IsUUID } from 'class-validator';
import { DEVICE_TYPE } from '@/devices/entities/device';

export class RegistrationInfo {
    @IsString() readonly email!: string;
    @IsString() readonly password: string;
    @IsString() readonly userAgent!: string;
    @IsEnum(DEVICE_TYPE) readonly deviceType!: string;
    @IsUUID() readonly deviceToken!: string;
    @IsString() readonly ip!: string;
}
