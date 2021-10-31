import { Prop, ModelOptions } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'users' } })
export class UserSchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true, unique: true })
    username!: string;

    @Prop()
    password: string;

    @Prop({ required: true })
    isVirtual!: boolean;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
