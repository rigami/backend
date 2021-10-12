import { IsEnum, IsDate, IsUUID, IsOptional } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { CommittedEntity } from '@/vcs/entities/committedEntity';

export enum STATE_ACTION {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class StateEntity extends CommittedEntity {
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
}
