import { IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { Bookmark } from '@/sync/modules/bookmarks/entities/bookmark';

export enum VARIANT {
    'poster' = 'poster',
    'default' = 'default',
    'symbol' = 'symbol',
}

export class BookmarkPull extends Bookmark {
    @Expose()
    @IsUUID()
    readonly cloudId: string;
}
