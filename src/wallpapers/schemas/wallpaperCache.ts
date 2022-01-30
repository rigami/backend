import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { WallpaperSchema } from '@/wallpapers/schemas/wallpaper';

@ModelOptions({ options: { customName: 'wallpapers' } })
@Index({ idInSource: 1, source: 1 }, { unique: true })
export class WallpaperCacheSchema extends WallpaperSchema {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop()
    query: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
