import { Expose } from 'class-transformer';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class BaseSyncEntity {
    @Expose()
    @IsString()
    readonly entityType: string;
}
