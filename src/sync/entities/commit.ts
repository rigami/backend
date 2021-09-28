import { IsString, IsUUID, IsEnum, IsDate } from 'class-validator';

enum action {
    'create' = 'create',
    'update' = 'update',
    'delete' = 'delete',
}

export class Commit {
    @IsUUID() readonly hash: string;
    @IsString() readonly entityType: string;
    @IsString() readonly entityId: string;
    @IsEnum(action) readonly action: string;
    readonly payload: string;
    @IsDate() readonly timestamp: Date;
}
