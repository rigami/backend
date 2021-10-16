import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'devices' } })
@Index({ holderUserId: 'text', type: 'text', deviceSign: 'text' })
export class DeviceSchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

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
