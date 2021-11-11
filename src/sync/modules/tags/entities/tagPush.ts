import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Tag } from './tag';
import { DeleteEntity } from '@/sync/entities/delete';
import { PairEntity } from '@/sync/entities/pair';

export class TagsPush {
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PairEntity)
    readonly pair?: PairEntity[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Tag)
    readonly create?: Tag[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Tag)
    readonly update?: Tag[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeleteEntity)
    readonly delete?: DeleteEntity[] = [];
}
