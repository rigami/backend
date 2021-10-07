import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'users' } })
@Index({ email: 'text' })
export class UserSchema {
    @Prop({ required: true, unique: true })
    email!: string;

    @Prop()
    password: string;

    @Prop({ required: true })
    isVirtual!: boolean;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
