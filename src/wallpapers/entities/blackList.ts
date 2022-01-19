import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { service } from '@/wallpapers/entities/wallpaper';
import { Expose } from 'class-transformer';

export enum BLOCKED_TYPE {
    'publisher' = 'publisher',
    'wallpaper' = 'wallpaper',
}

export class BlackListWallpaper {
    @IsString() @IsOptional() readonly id?: string;

    @IsString()
    readonly idInService: string;

    @IsEnum(service)
    @IsNotEmpty()
    service;

    @IsString()
    readonly sourceLink: string;

    @IsEnum(BLOCKED_TYPE)
    @IsNotEmpty()
    blockedType;

    @Expose()
    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
