import { IsOptional } from 'class-validator';

export class PullRequestEntity {
    @IsOptional()
    readonly fromCommit?: string;

    @IsOptional()
    readonly toCommit?: string;
}
