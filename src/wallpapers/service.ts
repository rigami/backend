import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { RateWallpaperSchema } from '@/wallpapers/schemas/rate';
import { rate } from '@/wallpapers/entities/rate';
import { type as WALLPAPER_TYPE, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { User } from '@/auth/users/entities/user';
import { plainToClass } from 'class-transformer';
import base64url from 'base64url';
import { UnsplashService } from '@/wallpapers/modules/unsplash.service';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';
import { PixabayService } from '@/wallpapers/modules/pixabay.service';
import { PexelsService } from '@/wallpapers/modules/pexels.service';

export type LiteWallpaper = Pick<Wallpaper, 'idInService' | 'service' | 'type'>;

export function decodeInternalId(internalId: string): LiteWallpaper {
    return plainToClass(Wallpaper, JSON.parse(base64url.decode(internalId)));
}

export function encodeInternalId(liteWallpaper: LiteWallpaper): string {
    return base64url(JSON.stringify(liteWallpaper));
}

@Injectable()
export class WallpapersService {
    private readonly logger = new Logger(WallpapersService.name);

    constructor(
        private unsplashService: UnsplashService,
        private pixabayService: PixabayService,
        private pexelsService: PexelsService,
        @InjectModel(RateWallpaperSchema)
        private readonly rateModel: ReturnModelType<typeof RateWallpaperSchema>,
        @InjectModel(WallpaperCacheSchema)
        private readonly wallpaperCacheModel: ReturnModelType<typeof WallpaperCacheSchema>,
    ) {}

    async saveToCache(wallpaper: Wallpaper) {
        await this.wallpaperCacheModel.create(wallpaper);
    }

    async search(query: string, count: number, type: WALLPAPER_TYPE): Promise<any> {
        if (type === WALLPAPER_TYPE.image) {
            return await this.unsplashService.search(query, count);
        } else {
            const halfCount = Math.ceil((count || 1) / 2);

            let wallpapers;

            const pexelsWallpapers = await this.pexelsService.search(query, halfCount);
            const pixabayWallpapers = await this.pixabayService.search(query, halfCount);

            wallpapers = [...pexelsWallpapers, ...pixabayWallpapers];

            if (pexelsWallpapers.length + pixabayWallpapers.length < count) {
                const addCount = count - (pexelsWallpapers.length + pixabayWallpapers.length);
                let addWallpapers;

                this.logger.log(`Not enough results. Request additional ${addCount} wallpapers`);

                if (pexelsWallpapers.length < pixabayWallpapers.length) {
                    addWallpapers = await this.pixabayService.search(query, addCount);
                } else {
                    addWallpapers = await this.pexelsService.search(query, addCount);
                }

                wallpapers = [...wallpapers, ...addWallpapers];
            }

            return wallpapers;
        }
    }

    async setRate(id: string, rate: rate, user: User): Promise<void> {
        await this.rateModel.create({
            userId: user.id,
            id,
            rate,
        });
    }

    async resetRate(id: string, user: User): Promise<void> {
        await this.rateModel.deleteOne({
            userId: user.id,
            id,
        });
    }
}
