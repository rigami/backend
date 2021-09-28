import { IsString, IsEnum, IsArray, IsNumber } from 'class-validator';
import { Entity } from '@/sync/entities/enitity';

export enum variant {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class Bookmark extends Entity {
    @IsString() readonly type: string = 'bookmark';
    @IsEnum(variant) readonly variant: string;
    @IsString() readonly url: string;
    @IsString() readonly imageUrl: string;
    @IsString() readonly title: string;
    @IsString() readonly description: string;
    @IsArray() readonly tagsIds: string[];
    @IsNumber() readonly folderId: number;
}
