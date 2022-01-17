import { IsEnum, IsString } from 'class-validator';
import { User } from '@/auth/users/entities/user';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

export class LoginInfo {
    @IsString() readonly user!: User;
    @IsString() readonly userAgent!: string;
    @IsEnum(DEVICE_TYPE) readonly deviceType!: string;
    @IsString() readonly deviceSign!: string;
    @IsString() readonly devicePlatform!: string;
    @IsString() readonly ip!: string;
}
