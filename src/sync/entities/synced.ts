import { IsEnum, IsDate, IsUUID, IsOptional } from 'class-validator';
import { Expose, Type } from 'class-transformer';

export enum STATE_ACTION {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class SyncedEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly userId?: string;

    @Expose()
    @IsEnum(STATE_ACTION)
    readonly lastAction: string;

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
