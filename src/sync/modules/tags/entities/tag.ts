import { IsNumber, IsString } from 'class-validator';
import { SnapshotEntity } from '@/sync/entities/snapshot';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Tag extends DefaultEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsNumber()
    readonly colorKey: number;
}

export class TagSnapshot extends SnapshotEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsNumber()
    readonly colorKey: number;
}
