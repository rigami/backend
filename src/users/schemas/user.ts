import { Prop, Index } from '@typegoose/typegoose';

@Index({ username: 'text' })
export class User {
    @Prop({ unique: true })
    email!: string;

    @Prop()
    password!: string;

    @Prop()
    isVirtual!: boolean;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
