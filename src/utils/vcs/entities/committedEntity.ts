import { Type } from 'class-transformer';

export class CommittedEntity {
    @Type(() => Date)
    readonly commit!: Date;
}
