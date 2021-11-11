import { BaseSyncEntity } from './base';
import { Expose } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class PairEntity extends BaseSyncEntity {
    @Expose()
    @IsUUID()
    readonly localId: string;

    @IsOptional()
    @IsUUID()
    readonly cloudId: string;
}
