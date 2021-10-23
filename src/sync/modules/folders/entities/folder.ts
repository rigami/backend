import { IsOptional, IsString, IsUUID } from 'class-validator';
import { SyncedEntity } from '@/sync/entities/synced';
import { Expose } from 'class-transformer';

export class Folder extends SyncedEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsUUID()
    @IsOptional()
    readonly parentId?: string;

    @Expose()
    @IsString()
    readonly name: string;
}
