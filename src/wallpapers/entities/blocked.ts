import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WALLPAPER_SOURCE } from '@/wallpapers/entities/wallpaper';
import { Expose } from 'class-transformer';

export enum BLOCKED_TYPE {
    'publisher' = 'publisher',
    'wallpaper' = 'wallpaper',
}

export enum BLOCKED_METHOD {
    'manual' = 'manual',
    'automatic' = 'automatic',
}

export class BlockedWallpaper {
    @IsString() @IsOptional() readonly id?: string;

    @IsString()
    readonly idInSource: string;

    @IsEnum(WALLPAPER_SOURCE)
    @IsNotEmpty()
    source;

    @IsString()
    readonly sourceLink: string;

    @IsEnum(BLOCKED_TYPE)
    @IsNotEmpty()
    blockedType;

    @IsEnum(BLOCKED_METHOD)
    @IsNotEmpty()
    blockedMethod;

    @Expose()
    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
