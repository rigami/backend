import { IsEnum, IsString } from 'class-validator';

export enum WALLPAPER_SOURCE {
    'unsplash' = 'unsplash',
    'pexels' = 'pexels',
    'pixabay' = 'pixabay',
}

export enum type {
    'image' = 'image',
    'video' = 'video',
}

export class Wallpaper {
    @IsString() readonly id: string;
    @IsString() readonly idInSource: string;

    @IsString() readonly rawSrc: string;
    @IsString() readonly fullSrc: string;
    @IsString() readonly previewSrc: string;
    @IsString() readonly sourceLink: string;

    @IsString() readonly author: string;
    @IsString() readonly authorName: string;
    @IsString() readonly authorAvatarSrc: string;
    @IsString() readonly description: string;
    @IsString() readonly color: string;

    @IsEnum(WALLPAPER_SOURCE) source = null;
    @IsEnum(type) type = null;
}
