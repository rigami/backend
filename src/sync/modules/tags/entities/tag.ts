import { IsString, IsUUID } from 'class-validator';
import { StateEntity } from '@/sync/entities/stateEnitity';
import { Expose } from 'class-transformer';

export class Tag extends StateEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsString()
    readonly color: string;
}
