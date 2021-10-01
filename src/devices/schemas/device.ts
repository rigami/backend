import { Prop, Index } from '@typegoose/typegoose';

@Index({ holderUserId: 'text', type: 'text', deviceSign: 'text' })
export class Device {
    @Prop()
    holderUserId: string;

    @Prop()
    userAgent: string;

    @Prop()
    type: string;

    @Prop()
    deviceSign!: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
