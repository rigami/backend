import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { User } from '@/auth/users/entities/user';
import { Expose, Type } from 'class-transformer';

export enum DEVICE_TYPE {
    'extension_chrome' = 'extension_chrome',
    'web' = 'web',
    'console' = 'console',
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
    @IsDate()
    @IsOptional()
    readonly createDate?: Date;

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

    @Expose()
    @IsEnum(DEVICE_TYPE)
    readonly type: DEVICE_TYPE;

    @IsUUID()
    @IsOptional()
    readonly sign?: string;

    @Expose()
    @IsString()
    readonly userAgent: string;

    @Expose()
    @IsString()
    readonly platform: string;

    @Expose()
    @IsString()
    @IsOptional()
    readonly lastActivityIp?: string;

    @Expose()
    @IsBoolean()
    @IsOptional()
    readonly isVerify?: boolean;
}
