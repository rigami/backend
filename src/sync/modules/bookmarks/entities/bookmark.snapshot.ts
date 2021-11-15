import { IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { SnapshotEntity } from '@/sync/entities/snapshot';
import { VARIANT } from '@/sync/modules/bookmarks/entities/bookmark';

export class BookmarkSnapshot extends SnapshotEntity {
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
