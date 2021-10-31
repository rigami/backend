import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'user-merge-requests' } })
@Index({ mergedUserId: 'text', code: 'text' })
export class UserMergeRequestSchema {
    @Prop({ required: true, unique: true })
    mergedUserId!: string;

    @Prop({ unique: true })
    code: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    expiredDate?: Date;
}
