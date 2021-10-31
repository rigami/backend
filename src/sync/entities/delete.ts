import { Expose, Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';

export class DeleteEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly updateDate: Date;
}
