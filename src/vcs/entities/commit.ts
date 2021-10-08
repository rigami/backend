import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

export class BaseCommit {
    readonly uuid!: string;

    @Type(() => Date)
    readonly date!: Date;
}

export class Commit extends BaseCommit {
    @IsOptional()
    @ValidateNested()
    @Type(() => BaseCommit)
    readonly rootCommit?: BaseCommit;

    @IsOptional()
    @ValidateNested()
    @Type(() => BaseCommit)
    readonly previousCommit?: BaseCommit;
}
