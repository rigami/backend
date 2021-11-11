import { IsDate, IsUUID, IsOptional } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export enum STATE_ACTION {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class SnapshotEntity extends DefaultEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly userId?: string;

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
