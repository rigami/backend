import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'devices' } })
@Index({ holderUserId: 'text', type: 'text', deviceSign: 'text' })
export class DeviceSchema {
    @Prop({ required: true })
    holderUserId: string;

    @Prop({ required: true })
    userAgent: string;

    @Prop({ required: true })
    type: string;

    @Prop({ required: true, unique: true })
    token: string;

    @Prop()
    deviceSign!: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
