import { Expose } from 'class-transformer';
import { IsBoolean, IsString } from 'class-validator';

export class CheckUpdateResponseEntity {
    @Expose()
    @IsBoolean()
    readonly existUpdate: boolean;

    @Expose()
    @IsString()
    readonly headCommit: string;
}
