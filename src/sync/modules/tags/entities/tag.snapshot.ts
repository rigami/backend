import { SnapshotEntity } from '@/sync/entities/snapshot';
import { Expose } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';

export class TagSnapshot extends SnapshotEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsNumber()
    readonly colorKey: number;
}
