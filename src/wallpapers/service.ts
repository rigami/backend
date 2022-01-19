import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { RateWallpaperSchema } from '@/wallpapers/schemas/rate';
import { rate } from '@/wallpapers/entities/rate';
import { service, type as WALLPAPER_TYPE, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { User } from '@/auth/users/entities/user';
import { plainToClass } from 'class-transformer';
import base64url from 'base64url';
import { UnsplashService } from '@/wallpapers/modules/unsplash.service';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';
import { PixabayService } from '@/wallpapers/modules/pixabay.service';
import { PexelsService } from '@/wallpapers/modules/pexels.service';

export type LiteWallpaper = Pick<Wallpaper, 'idInService' | 'service'>;

export function decodeInternalId(internalId: string): LiteWallpaper {
    return plainToClass(Wallpaper, JSON.parse(base64url.decode(internalId)));
}

export function encodeInternalId(liteWallpaper: LiteWallpaper): string {
    return base64url(JSON.stringify(liteWallpaper));
}

@Injectable()
export class WallpapersService {
    private readonly logger = new Logger(WallpapersService.name);
    private services = {};

    constructor(
        private unsplashService: UnsplashService,
        private pixabayService: PixabayService,
        private pexelsService: PexelsService,
        @InjectModel(RateWallpaperSchema)
        private readonly rateModel: ReturnModelType<typeof RateWallpaperSchema>,
        @InjectModel(WallpaperCacheSchema)
        private readonly wallpaperCacheModel: ReturnModelType<typeof WallpaperCacheSchema>,
    ) {
        this.services = {
            [service.unsplash]: unsplashService,
            [service.pixabay]: pixabayService,
            [service.pexels]: pexelsService,
        };
    }

    async saveToCache(wallpaper: Wallpaper) {
        await this.wallpaperCacheModel.create(wallpaper);
    }

    async search(query: string, count: number, type: WALLPAPER_TYPE): Promise<any> {
        this.logger.log(`Search wallpapers query:${query} count:${count} type:${type}...`);
        if (type === WALLPAPER_TYPE.image) {
            const wallpapers = await this.unsplashService.search(query, count);

            this.logger.log(`Found ${wallpapers.length} in unsplash service...`);
        } else {
            const halfCount = Math.ceil((count || 1) / 2);

            let wallpapers;

            const pexelsWallpapers = await this.pexelsService.search(query, halfCount);
            const pixabayWallpapers = await this.pixabayService.search(query, halfCount);

            wallpapers = [...pexelsWallpapers, ...pixabayWallpapers];

            this.logger.log(
                `Found ${pexelsWallpapers.length} in pexels service and ${pixabayWallpapers.length} in pixabay service`,
            );

            if (pexelsWallpapers.length + pixabayWallpapers.length < count) {
                const addCount = count - (pexelsWallpapers.length + pixabayWallpapers.length);
                let addWallpapers;

                if (pexelsWallpapers.length < pixabayWallpapers.length) {
                    this.logger.log(
                        `Not enough results. Request additional ${addCount} wallpapers pixabay from service...`,
                    );
                    addWallpapers = await this.pixabayService.search(query, addCount);
                    this.logger.log(`Found ${addWallpapers.length} in pixabay service...`);
                } else {
                    this.logger.log(
                        `Not enough results. Request additional ${addCount} wallpapers pexels from service...`,
                    );
                    addWallpapers = await this.pexelsService.search(query, addCount);
                    this.logger.log(`Found ${addWallpapers.length} in pexels service...`);
                }

                wallpapers = [...wallpapers, ...addWallpapers];
            }

            return wallpapers;
        }
    }

    async getWallpaper(service: service, idInService: string): Promise<Wallpaper> {
        return this.services[service].getById(idInService);
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
