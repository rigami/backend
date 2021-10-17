import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Bookmark } from './bookmark';
import { DeleteEntity } from '@/sync/entities/state';

export class BookmarksState {
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Bookmark)
    readonly create?: Bookmark[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Bookmark)
    readonly update?: Bookmark[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeleteEntity)
    readonly delete?: DeleteEntity[] = [];
}
