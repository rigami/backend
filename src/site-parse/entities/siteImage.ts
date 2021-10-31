import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

enum types {
    'poster' = 'poster',
    'icon' = 'icon',
    'small-icon' = 'small-icon',
}

export class SiteImage {
    @IsString() url = '';
    @IsString() baseUrl = '';
    @IsNumber() @IsOptional() width: number;
    @IsNumber() @IsOptional() height: number;
    @IsNumber() score = 0;
    @IsEnum(types) type = '';
}
