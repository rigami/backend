import { IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { SyncedEntity } from '@/sync/entities/synced';
import { Expose } from 'class-transformer';

export enum VARIANT {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class Bookmark extends SyncedEntity {
    @Expose() @IsUUID() readonly id: string;
    @Expose() @IsEnum(VARIANT) readonly variant: string;
    @Expose() @IsString() readonly url: string;
    @Expose() @IsString() readonly imageUrl: string;
    @Expose() @IsString() readonly title: string;
    @Expose() @IsString() readonly description: string;
    @Expose() @IsArray() readonly tagsIds: string[];
    @Expose() @IsUUID() readonly folderId: string;
}
