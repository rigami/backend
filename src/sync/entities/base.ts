import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export class BaseSyncEntity {
    @Expose()
    @IsString()
    readonly entityType: 'folder' | 'tag' | 'bookmark';
}
