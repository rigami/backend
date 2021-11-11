import { IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { Bookmark } from '@/sync/modules/bookmarks/entities/bookmark';

export enum VARIANT {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class BookmarkPush extends Bookmark {
    @Expose()
    @IsUUID()
    readonly localId: string;

    @Expose()
    @IsUUID()
    readonly cloudId: string;
}
