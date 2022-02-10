import { SnapshotEntity } from '@/sync/entities/snapshot';
import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class SettingSnapshot extends SnapshotEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsString()
    readonly value: string;
}
