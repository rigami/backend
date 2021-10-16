import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class Commit {
    @Type(() => Date)
    readonly head!: Date;

    @Type(() => Date)
    readonly root?: Date;

    @IsOptional()
    @Type(() => Date)
    readonly previous?: Date;
}
