import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Folder } from './folder';
import { DeleteEntity } from '@/sync/entities/delete';
import { PairEntity } from '@/sync/entities/pair';

export class FoldersPush {
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => PairEntity)
    readonly pair?: PairEntity[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Folder)
    readonly create?: Folder[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Folder)
    readonly update?: Folder[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeleteEntity)
    readonly delete?: DeleteEntity[] = [];
}
