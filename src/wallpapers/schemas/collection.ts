import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { WallpaperSchema } from '@/wallpapers/schemas/wallpaper';

@ModelOptions({ options: { customName: 'collection-wallpapers' } })
@Index({ idInSource: 1, service: 1, collectionType: 1 }, { unique: true })
export class CollectionWallpaperSchema extends WallpaperSchema {
    @Prop({ required: true })
    collectionType: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
