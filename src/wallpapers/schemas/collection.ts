import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';

@ModelOptions({ options: { customName: 'collection-wallpapers' } })
@Index({ idInService: 1, service: 1, collectionType: 1 }, { unique: true })
export class CollectionWallpaperSchema extends WallpaperCacheSchema {
    @Prop({ required: true })
    collectionType: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
