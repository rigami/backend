import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@ModelOptions({ options: { customName: 'state' } })
@Index({ userId: '' })
export class StateHashSchema {
    @Prop({ required: true })
    hash: string;

    @Prop({ required: true, unique: true })
    userId!: string;

    @IsDate()
    @Type(() => Date)
    @Prop({ required: true, default: () => new Date() })
    readonly updateDate: Date;
}
