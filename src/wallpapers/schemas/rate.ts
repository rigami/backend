import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { WALLPAPER_SOURCE, type } from '@/wallpapers/entities/wallpaper';
import { RATE } from '@/wallpapers/entities/rate';

@ModelOptions({ options: { customName: 'rate-wallpapers' } })
@Index({ id: 1, userId: 1 }, { unique: true })
export class RateWallpaperSchema {
    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    idInSource: string;

    @Prop({ required: true, enum: Object.keys(WALLPAPER_SOURCE) })
    source: string;

    @Prop({ required: true, enum: Object.keys(type) })
    type: string;

    @Prop({ required: true, enum: Object.keys(RATE) })
    rate: string;
}
