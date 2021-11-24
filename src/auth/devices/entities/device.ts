import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { User } from '@/auth/users/entities/user';
import { Expose, Type } from 'class-transformer';

export enum DEVICE_TYPE {
    'EXTENSION_CHROME' = 'EXTENSION_CHROME',
    'WEB' = 'WEB',
    'ANDROID' = 'ANDROID',
    'IOS' = 'IOS',
}

export class Device {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly id?: string;

    @Expose()
    @IsString()
    @IsOptional()
    readonly holderUserId?: string;

    @Expose()
    @IsString()
    readonly userAgent: string;

    @Expose()
    @IsEnum(DEVICE_TYPE)
    readonly type: string;

    @IsUUID()
    @IsOptional()
    readonly token?: string;

    @IsUUID()
    @IsOptional()
    readonly deviceSign?: string;

    @Expose()
    @IsDate()
    @IsOptional()
    readonly createDate?: Date;

    @Expose()
    @IsString()
    @IsOptional()
    readonly lastActivityIp?: string;

    @Expose()
    @IsDate()
    @IsOptional()
    readonly lastActivityDate?: Date;

    @ValidateNested({ each: true })
    @Type(() => User)
    @IsOptional()
    readonly owner?: User;

    @IsBoolean()
    @IsOptional()
    readonly isTemp?: boolean = false;
}
