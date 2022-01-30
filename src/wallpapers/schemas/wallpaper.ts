import { Index, Prop } from '@typegoose/typegoose';
import { WALLPAPER_SOURCE, type } from '@/wallpapers/entities/wallpaper';

@Index({ idInSource: 1, source: 1 }, { unique: true })
export class WallpaperSchema {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    idInSource: string;

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

    @Prop({ required: true, enum: Object.keys(WALLPAPER_SOURCE) })
    source: string;

    @Prop({ required: true, enum: Object.keys(type) })
    type: string;
}
