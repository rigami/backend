import { IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export enum VARIANT {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class Bookmark extends DefaultEntity {
    @Expose()
    @IsEnum(VARIANT)
    readonly variant: string;

    @Expose()
    @IsString()
    readonly url: string;

    @Expose()
    @IsString()
    readonly imageUrl: string;

    @Expose()
    @IsString()
    readonly title: string;

    @Expose()
    @IsString()
    readonly description: string;

    @Expose()
    @IsArray()
    readonly tagsIds: string[];

    @Expose()
    @IsUUID()
    readonly folderId: string;
}
