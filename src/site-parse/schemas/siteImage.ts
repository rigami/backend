import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

@ModelOptions({ options: { customName: 'site-images' } })
@Index({ fileName: 'text' })
export class SiteImageSchema {
    @Prop({
        required: true,
        unique: true,
    })
    fileName!: string;

    @Prop({ required: true })
    baseUrl!: string;

    @Prop()
    width?: number;

    @Prop()
    height?: number;

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
