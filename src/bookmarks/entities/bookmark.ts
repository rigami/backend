import { IsString, IsNumber, IsEnum, IsArray } from 'class-validator';
import { StateEntity } from '@/sync/entities/stateEnitity';

export enum VARIANT {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class Bookmark extends StateEntity {
    @IsEnum(VARIANT) readonly variant: string;
    @IsString() readonly url: string;
    @IsString() readonly imageUrl: string;
    @IsString() readonly title: string;
    @IsString() readonly description: string;
    @IsArray() readonly tagsIds: string[];
    @IsNumber() readonly folderId: number;
}
