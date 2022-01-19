import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { service } from '@/wallpapers/entities/wallpaper';
import { BLOCKED_TYPE } from '@/wallpapers/entities/blackList';

@ModelOptions({ options: { customName: 'blacklist-wallpapers' } })
@Index({ idInService: 1, service: 1, userId: 1 }, { unique: true })
export class BlacklistWallpaperSchema {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    idInService: string;

    @Prop({ required: true })
    sourceLink: string;

    @Prop({ required: true, enum: Object.keys(service) })
    service: string;

    @Prop({ required: true, enum: Object.keys(BLOCKED_TYPE) })
    blockedType: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
