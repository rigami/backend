import { Expose, Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { DeleteEntity } from './delete';
import { SyncPairEntity } from './sync';

export class PullResponseEntity {
    @IsOptional()
    readonly headCommit?: string;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncPairEntity)
    readonly create!: SyncPairEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncPairEntity)
    readonly update!: SyncPairEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => DeleteEntity)
    readonly delete!: DeleteEntity[];
}
