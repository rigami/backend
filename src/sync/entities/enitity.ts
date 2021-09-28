import { IsString, IsUUID, IsEnum, IsDate } from 'class-validator';

export enum action {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class Entity {
    @IsUUID() readonly hash: string;
    @IsString() readonly type: string;
    @IsString() readonly userId: string;
    @IsEnum(action) readonly lastAction: string;
    @IsDate() readonly createDate: Date;
    @IsDate() readonly updateDate: Date;
}
