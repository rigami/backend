import { Prop, Index } from '@typegoose/typegoose';

@Index({ fileName: 'text' })
export class SiteImage {
    @Prop({
        required: true,
        unique: true,
    })
    fileName!: string;

    @Prop({ required: true })
    baseUrl!: string;

    @Prop()
    score?: number;

    @Prop({
        required: true,
        enum: ['poster', 'icon', 'small-icon'],
    })
    type!: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
