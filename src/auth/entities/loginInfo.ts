import { IsEnum, IsString, IsUUID } from 'class-validator';
import { User } from '@/users/entities/user';
import { DEVICE_TYPE } from '@/devices/entities/device';

export class LoginInfo {
    @IsString() readonly user!: User;
    @IsString() readonly userAgent!: string;
    @IsEnum(DEVICE_TYPE) readonly deviceType!: string;
    @IsUUID() readonly deviceToken!: string;
    @IsString() readonly ip!: string;
}
