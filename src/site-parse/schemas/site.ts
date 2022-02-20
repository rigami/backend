import { Prop, Index, ModelOptions } from '@typegoose/typegoose';

class SiteImageLite {
    @Prop({ required: true })
    baseUrl!: string;

    @Prop()
    width?: number;

    @Prop()
    height?: number;

    @Prop()
    score?: number;

    @Prop({ required: true })
    type!: string;

    @Prop({ required: true })
    recommendedTypes!: string[];
}

@ModelOptions({ options: { customName: 'sites' } })
@Index({ url: 'text', rootUrl: 'text', host: 'text' })
export class SiteSchema {
    @Prop({ unique: true })
    url!: string;

    @Prop()
    rootUrl!: string;

    @Prop()
    protocol!: string;

    @Prop()
    host!: string;

    @Prop()
    title?: string;

    @Prop()
    description?: string;

    // FIXME: Setting "Mixed" for property "Site.icons"
    @Prop()
    images?: SiteImageLite[];

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
