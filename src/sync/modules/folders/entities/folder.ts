import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';
import { SnapshotEntity } from '@/sync/entities/snapshot';
import { Expose, Type } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Folder extends DefaultEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly parentId?: string;

    @Expose()
    @IsString()
    readonly name: string;
}

export class FolderSnapshot extends SnapshotEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly parentId?: string;

    @Expose()
    @IsString()
    readonly name: string;
}
