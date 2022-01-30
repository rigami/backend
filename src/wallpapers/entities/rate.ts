import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { WALLPAPER_SOURCE, type } from '@/wallpapers/entities/wallpaper';

export enum RATE {
    'like' = 'like',
    'dislike' = 'dislike',
}

export class RateWallpaper {
    @IsUUID() readonly userId: string;
    @IsString() readonly id: string;
    @IsString() readonly idInSource: string;
    @IsEnum(WALLPAPER_SOURCE) @IsNotEmpty() WALLPAPER_SOURCE;
    @IsEnum(type) @IsNotEmpty() type;
    @IsEnum(RATE) @IsNotEmpty() rate;
}
