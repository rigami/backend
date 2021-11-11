import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsString, ValidateNested } from 'class-validator';
import { SyncPairEntity } from './sync';
import { DeletePairEntity } from './delete';
import { PairEntity } from './pair';

export class PushResponseEntity {
    @Expose()
    @IsBoolean()
    readonly existUpdate: boolean;

    @Expose()
    @IsString()
    readonly fromCommit: string;

    @Expose()
    @IsString()
    readonly toCommit: string;

    @Expose()
    @IsString()
    readonly headCommit: string;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncPairEntity)
    readonly create!: SyncPairEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => PairEntity)
    readonly pair!: PairEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => SyncPairEntity)
    readonly update!: SyncPairEntity[];

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => DeletePairEntity)
    readonly delete!: DeletePairEntity[];
}
