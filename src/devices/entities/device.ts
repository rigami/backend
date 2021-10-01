import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DEVICE_TYPE {
    'EXTENSION_CHROME' = 'EXTENSION_CHROME',
    'WEB' = 'WEB',
    'ANDROID' = 'ANDROID',
    'IOS' = 'IOS',
}

export class Device {
    @IsNumber() @IsOptional() readonly id: string;
    @IsString() @IsOptional() readonly holderUserId: string;
    @IsString() readonly userAgent: string;
    @IsEnum(DEVICE_TYPE) readonly type: string;
    @IsUUID() @IsOptional() readonly deviceSign: string;
    @IsDate() @IsOptional() readonly createDate: Date;
}
