import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { SnapshotEntity } from '@/sync/entities/snapshot';

export class FavoriteSnapshot extends SnapshotEntity {
    @Expose()
    @IsString()
    readonly itemId: string;

    @Expose()
    @IsString()
    readonly itemType: string;
}
