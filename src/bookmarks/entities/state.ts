import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { Bookmark } from './bookmark';
import { Type } from 'class-transformer';

export class State {
    @IsDefined()
    readonly commit!: string;

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
    readonly delete?: string[] = [];
}
