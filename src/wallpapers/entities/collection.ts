import { IsDate, IsOptional, IsString } from 'class-validator';
import { Wallpaper } from '@/wallpapers/entities/wallpaper';
import { Expose } from 'class-transformer';

export class CollectionWallpaper extends Wallpaper {
    @IsString() readonly collectionType;

    @Expose()
    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
