import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { service } from '@/wallpapers/entities/wallpaper';

export enum type {
    'publisher' = 'publisher',
    'wallpaper' = 'wallpaper',
}

export class BlackListWallpaper {
    @IsString() readonly idInService: string;
    @IsEnum(service) @IsNotEmpty() service;
    @IsString() readonly sourceLink: string;
    @IsEnum(type) @IsNotEmpty() type;
}
