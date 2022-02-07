import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';
import { STATUS } from '@/auth/utils/status.enum';

@ModelOptions({ options: { customName: 'devices' } })
@Index({ holderUserId: 1, id: 1 }, { unique: true })
export class DeviceSchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    holderUserId: string;

    @Prop({ required: true })
    userAgent: string;

    @Prop({ required: true, enum: Object.keys(DEVICE_TYPE) })
    type: DEVICE_TYPE;

    @Prop({ required: true, unique: true })
    sign: string;

    @Prop({ required: true })
    platform: string;

    @Prop({ required: true, enum: Object.keys(STATUS), default: () => STATUS.active })
    status?: STATUS;

    @Prop({ required: true, default: () => new Date() })
    statusChangeDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    lastActivityDate?: Date;

    @Prop({ required: true })
    lastActivityIp: string;
}
