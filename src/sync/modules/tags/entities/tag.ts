import { IsNumber, IsString, IsUUID } from 'class-validator';
import { SyncedEntity } from '@/sync/entities/snapshot';
import { Expose } from 'class-transformer';

export class Tag extends SyncedEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsNumber()
    readonly colorKey: number;
}
