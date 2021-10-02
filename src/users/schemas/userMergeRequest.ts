import { Prop, Index } from '@typegoose/typegoose';

@Index({ mergedUserId: 'text', code: 'text' })
export class UserMergeRequest {
    @Prop({ required: true, unique: true })
    mergedUserId!: string;

    @Prop({ unique: true })
    code: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
