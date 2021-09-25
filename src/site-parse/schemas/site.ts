import { Prop, Index } from '@typegoose/typegoose';
import { SiteImage } from './siteImage';

@Index({ url: 'text', rootUrl: 'text', host: 'text' })
export class Site {
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
    images?: SiteImage[];

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
