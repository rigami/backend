import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { service, type } from '@/wallpapers/entities/wallpaper';

@ModelOptions({ options: { customName: 'blacklist-wallpapers' } })
@Index({ idInService: 1, service: 1, userId: 1 }, { unique: true })
export class BlacklistWallpaperSchema {
    @Prop({ required: true })
    sourceLink: string;

    @Prop({ required: true })
    idInService: string;

    @Prop({ required: true, enum: Object.keys(service) })
    service: string;

    @Prop({ required: true, enum: Object.keys(type) })
    type: string;
}
