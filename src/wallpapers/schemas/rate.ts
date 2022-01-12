import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { service, type } from '@/wallpapers/entities/wallpaper';
import { rate } from '@/wallpapers/entities/rate';

@ModelOptions({ options: { customName: 'rate-wallpapers' } })
@Index({ idInService: 1, service: 1, userId: 1 }, { unique: true })
export class RateWallpaperSchema {
    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    idInService: string;

    @Prop({ required: true, enum: Object.keys(service) })
    service: string;

    @Prop({ required: true, enum: Object.keys(type) })
    type: string;

    @Prop({ required: true, enum: Object.keys(rate) })
    rate: string;
}
