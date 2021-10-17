import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Folder } from './folder';
import { DeleteEntity } from '@/sync/entities/state';

export class FoldersState {
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
