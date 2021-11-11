import { Expose, Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { DeletePairEntity } from './delete';
import { SyncPairEntity, CreatePairEntity } from './sync';

export class PushRequestEntity {
    @IsOptional()
    readonly localCommit?: string = null;

    @Expose()
    @IsDefined()
    @ValidateNested()
    @Type(() => CreatePairEntity)
    readonly create!: CreatePairEntity[];

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
