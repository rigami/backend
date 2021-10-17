import { IsDate, IsDefined, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { BookmarksState } from '@/sync/modules/bookmarks/entities/state';
import { FoldersState } from '@/sync/modules/folders/entities/state';
import { TagsState } from '@/sync/modules/tags/entities/state';

export class DeleteEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly updateDate: Date;
}

export class State {
    @IsOptional()
    readonly commit?: string;

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
