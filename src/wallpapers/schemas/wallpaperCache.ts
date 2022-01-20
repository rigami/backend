import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { service, type } from '@/wallpapers/entities/wallpaper';

@ModelOptions({ options: { customName: 'wallpapers' } })
@Index({ idInService: 1, service: 1 }, { unique: true })
export class WallpaperCacheSchema {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    idInService: string;

    @Prop({ required: true })
    rawSrc: string;

    @Prop({ required: true })
    fullSrc: string;

    @Prop({ required: true })
    previewSrc: string;

    @Prop({ required: true })
    sourceLink: string;

    @Prop({ required: true })
    author: string;

    @Prop()
    authorName: string;

    @Prop()
    authorAvatarSrc: string;

    @Prop()
    description: string;

    @Prop()
    color: string;

    @Prop({ required: true, enum: Object.keys(service) })
    service: string;

    @Prop({ required: true, enum: Object.keys(type) })
    type: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
