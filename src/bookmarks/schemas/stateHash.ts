import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'state' } })
@Index({ userId: '' })
export class StateHashSchema {
    @Prop({ required: true })
    hash: string;

    @Prop({ required: true, unique: true })
    userId!: string;
}
