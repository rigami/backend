import { IsString, IsArray, ValidateNested } from 'class-validator';
import { SiteImage } from './siteImage';

export class Site {
    @IsString() readonly url: string;
    @IsString() readonly rootUrl: string;
    @IsString() readonly protocol: string;
    @IsString() readonly host: string;
    @IsString() readonly title: string;
    @IsString() readonly description: string;
    @ValidateNested() @IsArray() readonly images: Array<SiteImage>;
}
