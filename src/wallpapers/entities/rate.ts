import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { service, type } from '@/wallpapers/entities/wallpaper';

export enum rate {
    'like' = 'like',
    'dislike' = 'dislike',
}

export class RateWallpaper {
    @IsUUID() readonly userId: string;
    @IsString() readonly idInService: string;
    @IsEnum(service) @IsNotEmpty() service;
    @IsEnum(type) @IsNotEmpty() type;
    @IsEnum(rate) @IsNotEmpty() rate;
}
