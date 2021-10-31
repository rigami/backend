import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@ModelOptions({ options: { customName: 'state' } })
@Index({ userId: 1, model: 1 }, { unique: true })
export class CommitSchema {
    @Prop({ required: true })
    @Type(() => Date)
    root: Date;

    @Prop()
    @Type(() => Date)
    previous?: Date;

    @Prop({ required: true })
    @Type(() => Date)
    head: Date;

    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    model!: string;

    @IsDate()
    @Type(() => Date)
    @Prop({ required: true, default: () => new Date() })
    readonly updateDate: Date;
}
