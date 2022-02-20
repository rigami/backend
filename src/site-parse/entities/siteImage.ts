import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested } from 'class-validator';

export enum SITE_IMAGE_TYPE {
    'cover' = 'cover',
    'poster' = 'poster',
    'icon' = 'icon',
    'small_icon' = 'small-icon',
}

export class SiteImage {
    @IsString()
    url = '';

    @IsString()
    baseUrl = '';

    @IsNumber()
    @IsOptional()
    width: number;

    @IsNumber()
    @IsOptional()
    height: number;

    @IsNumber()
    score = 0;

    @IsEnum(SITE_IMAGE_TYPE)
    type = '';

    @ValidateNested()
    @IsEnum(SITE_IMAGE_TYPE)
    recommendedTypes = [];
}
