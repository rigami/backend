import { Index, ModelOptions, Prop } from '@typegoose/typegoose';
import { service } from '@/wallpapers/entities/wallpaper';
import { BLOCKED_METHOD, BLOCKED_TYPE } from '@/wallpapers/entities/blocked';

@ModelOptions({ options: { customName: 'blocked-wallpapers' } })
@Index({ idInService: 1, service: 1, userId: 1 }, { unique: true })
export class BlockedWallpaperSchema {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ required: true })
    idInService: string;

    @Prop({ required: true })
    sourceLink: string;

    @Prop({ required: true, enum: Object.keys(service) })
    service: string;

    @Prop({ required: true, enum: Object.keys(BLOCKED_TYPE) })
    blockedType: BLOCKED_TYPE;

    @Prop({ required: true, enum: Object.keys(BLOCKED_METHOD) })
    blockedMethod: BLOCKED_METHOD;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;
}
