import { IsOptional, IsString, IsUUID } from 'class-validator';
import { StateEntity } from '@/sync/entities/stateEnitity';
import { Expose } from 'class-transformer';

export class Folder extends StateEntity {
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
