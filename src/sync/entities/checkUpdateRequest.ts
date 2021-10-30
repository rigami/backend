import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class CheckUpdateRequestEntity {
    @Expose()
    @IsOptional()
    @IsString()
    readonly fromCommit?: string;
}
