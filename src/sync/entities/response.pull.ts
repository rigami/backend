import { Expose, Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { DeleteEntity } from './delete';
import { SyncEntity } from './sync';

export class PullResponseEntity {
    @IsOptional()
    readonly headCommit?: string;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncEntity)
    readonly create!: SyncEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncEntity)
    readonly update!: SyncEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => DeleteEntity)
    readonly delete!: DeleteEntity[];
}
