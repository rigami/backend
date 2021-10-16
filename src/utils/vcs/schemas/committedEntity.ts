import { Type } from 'class-transformer';
import { Prop } from '@typegoose/typegoose';

export class CommittedEntitySchema {
    @Prop({ required: true })
    @Type(() => Date)
    readonly commit!: Date;
}
