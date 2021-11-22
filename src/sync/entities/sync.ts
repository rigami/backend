import { Expose, Type } from 'class-transformer';
import { IsDate, IsObject, IsOptional, IsUUID } from 'class-validator';
import { BaseSyncEntity } from './base';

export class SyncEntity extends BaseSyncEntity {
    @Expose()
    @IsObject()
    readonly payload: any;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly createDate: Date;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly updateDate: Date;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    readonly createCommit?: Date;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    readonly updateCommit?: Date;
}

export class SyncPairEntity extends SyncEntity {
    @Expose()
    @IsUUID()
    readonly id: string;
}

export class CreatePairEntity extends SyncEntity {
    @Expose()
    @IsUUID()
    readonly tempId: string;
}
