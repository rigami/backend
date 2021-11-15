import { Expose, Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';
import { BaseSyncEntity } from './base';

export class DeleteEntity {
    @Expose()
    @IsUUID()
    readonly id: string;
}

export class DeletePairEntity extends BaseSyncEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly deleteDate: Date;
}
