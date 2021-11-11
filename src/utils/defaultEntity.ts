import { Expose, Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';

export class DefaultEntity {
    @Expose()
    @IsUUID()
    readonly id: string;
}
