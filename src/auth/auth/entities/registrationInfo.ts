import { IsEnum, IsString, IsUUID } from 'class-validator';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

export class RegistrationInfo {
    @IsString() readonly username!: string;
    @IsString() readonly password: string;
}
