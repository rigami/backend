import { Type } from 'class-transformer';

export class Stage {
    @Type(() => Date)
    readonly commit!: Date;
}
