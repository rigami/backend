import { Prop, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'user-merge-requests' } })
export class UserMergeRequestSchema {
    @Prop({ required: true, unique: true })
    mergedUserId!: string;

    @Prop({ required: true })
    mergedUserIsTemp!: boolean;

    @Prop({ required: true, unique: true })
    mergedFromDeviceId!: string;

    @Prop({ unique: true })
    code: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    expiredDate?: Date;
}
