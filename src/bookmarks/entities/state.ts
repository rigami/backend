import { IsOptional, ValidateNested } from 'class-validator';
import { Bookmark } from './bookmark';
import { DeletedEntity } from '@/sync/entities/deletedEntity';
import { Type } from 'class-transformer';

export class State {
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
    @Type(() => DeletedEntity)
    readonly delete?: DeletedEntity[] = [];
}
