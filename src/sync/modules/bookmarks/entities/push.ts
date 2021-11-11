import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BookmarkPush } from './bookmarkPush';
import { DeleteEntity } from '@/sync/entities/delete';
import { PairEntity } from '@/sync/entities/pair';

export class BookmarksPush {
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PairEntity)
    readonly pair?: PairEntity[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => BookmarkPush)
    readonly create?: BookmarkPush[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => BookmarkPush)
    readonly update?: BookmarkPush[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeleteEntity)
    readonly delete?: DeleteEntity[] = [];
}
