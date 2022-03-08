import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { SITE_IMAGE_TYPE } from '@/site-parse/entities/siteImage';

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

    @Prop()
    safeZone?: number;

    @Prop({
        required: true,
        enum: [...Object.keys(SITE_IMAGE_TYPE).map((key) => SITE_IMAGE_TYPE[key]), 'unknown'],
    })
    type!: string;

    @Prop({ required: true })
    recommendedTypes!: string[];

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
