import { Expose, Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { BookmarksState } from '@/sync/modules/bookmarks/entities/state';
import { FoldersState } from '@/sync/modules/folders/entities/state';
import { TagsState } from '@/sync/modules/tags/entities/state';

export class PullResponseEntity {
    @IsOptional()
    readonly headCommit?: string;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => BookmarksState)
    readonly bookmarks!: BookmarksState;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => FoldersState)
    readonly folders!: FoldersState;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => TagsState)
    readonly tags!: TagsState;
}
