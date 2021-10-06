import { IsString, IsDate } from 'class-validator';
import { StateEntity } from '@/sync/entities/stateEnitity';
import { Type } from 'class-transformer';

export class DeletedEntity extends StateEntity {
    @IsString() readonly entityId: string;

    @IsDate()
    @Type(() => Date)
    readonly deleteDate: Date;
}
