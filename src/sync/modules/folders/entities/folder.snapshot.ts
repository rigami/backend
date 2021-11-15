import { SnapshotEntity } from '@/sync/entities/snapshot';
import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class FolderSnapshot extends SnapshotEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly parentId?: string;

    @Expose()
    @IsString()
    readonly name: string;
}
