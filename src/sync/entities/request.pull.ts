import { IsOptional } from 'class-validator';

export class PullRequestEntity {
    @IsOptional()
    readonly fromCommit?: string = null;

    @IsOptional()
    readonly toCommit?: string = null;
}
