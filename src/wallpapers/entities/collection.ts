import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { service, type, Wallpaper } from '@/wallpapers/entities/wallpaper';

export class CollectionWallpaper extends Wallpaper {
    @IsString() readonly collectionType;
}
