import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SiteImage {
    @IsString() url = '';
    @IsString() baseUrl = '';
    @IsNumber() @IsOptional() width: number;
    @IsNumber() @IsOptional() height: number;
    @IsNumber() score = 0;
}
