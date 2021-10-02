import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { User } from '@/users/entities/user';
import { Type } from 'class-transformer';

export enum DEVICE_TYPE {
    'EXTENSION_CHROME' = 'EXTENSION_CHROME',
    'WEB' = 'WEB',
    'ANDROID' = 'ANDROID',
    'IOS' = 'IOS',
}

export class Device {
    @IsNumber() @IsOptional() readonly id?: string;
    @IsString() @IsOptional() readonly holderUserId?: string;
    @IsString() readonly userAgent: string;
    @IsEnum(DEVICE_TYPE) readonly type: string;
    @IsUUID() @IsOptional() readonly deviceSign?: string;
    @IsDate() @IsOptional() readonly createDate?: Date;

    @ValidateNested({ each: true })
    @Type(() => User)
    @IsOptional()
    readonly owner?: User;
}
