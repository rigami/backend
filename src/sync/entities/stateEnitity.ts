import { IsString, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export enum STATE_ACTION {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class StateEntity {
    @IsString() readonly userId: string;
    @IsEnum(STATE_ACTION) readonly lastAction: string;

    @IsDate()
    @Type(() => Date)
    readonly createDate: Date;

    @IsDate()
    @Type(() => Date)
    readonly updateDate: Date;
}
