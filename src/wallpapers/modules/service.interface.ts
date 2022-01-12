import { Wallpaper } from '@/wallpapers/entities/wallpaper';
import { LiteWallpaper } from '@/wallpapers/service';

export interface IWallpapersService {
    search(query: string, count: number): Promise<Wallpaper[]>;
    getRandom(query: string, count: number): Promise<Wallpaper[]>;
    getRandomByCollection(collection: string, count: number): Promise<Wallpaper[]>;
    markDownload(wallpaper: LiteWallpaper): void;
}
