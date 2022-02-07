import { Prop, ModelOptions } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { ROLE } from '@/auth/users/entities/user';
import { STATUS } from '@/auth/utils/status.enum';

@ModelOptions({ options: { customName: 'users' } })
export class UserSchema {
    @Prop({ required: true, unique: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true, unique: true })
    username!: string;

    @Prop()
    password: string;

    @Prop({ required: true, enum: Object.keys(ROLE) })
    role!: ROLE;

    @Prop({ required: true, enum: Object.keys(STATUS), default: () => STATUS.active })
    status?: STATUS;

    @Prop({ required: true, default: () => new Date() })
    statusChangeDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
