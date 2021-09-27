import { Prop, Index } from '@typegoose/typegoose';

@Index({ username: 'text' })
export class User {
    @Prop({ unique: true })
    username!: string;

    @Prop()
    password!: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
