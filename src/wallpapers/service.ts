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
import { Interval } from '@nestjs/schedule';
import { BlockedWallpaperSchema } from '@/wallpapers/schemas/blocked';
import { BLOCKED_TYPE } from '@/wallpapers/entities/blocked';

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
        @InjectModel(BlockedWallpaperSchema)
        private readonly blackListWallpaperModel: ReturnModelType<typeof BlockedWallpaperSchema>,
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

        let wallpapers = [];

        if (!type || type === WALLPAPER_TYPE.image) {
            wallpapers = await this.unsplashService.search(query, count);

            this.logger.log(`Found ${wallpapers.length} in unsplash service...`);
        }

        if (!type || type === WALLPAPER_TYPE.video) {
            const halfCount = Math.ceil((count || 1) / 2);

            const [pexelsWallpapers, pixabayWallpapers] = await Promise.all([
                this.pexelsService.search(query, halfCount),
                this.pixabayService.search(query, halfCount),
            ]);

            wallpapers = [...wallpapers, ...pexelsWallpapers, ...pixabayWallpapers];

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
        }

        return wallpapers.sort(() => Math.random() - 0.5).slice(0, count);
    }

    async random(query: string, count: number, type: WALLPAPER_TYPE): Promise<any> {
        this.logger.log(`Search random wallpapers query:${query} count:${count} type:${type}...`);

        let wallpapers = [];

        if (!type || type === WALLPAPER_TYPE.image) {
            wallpapers = await this.unsplashService.getRandom(query, count);

            this.logger.log(`Found ${wallpapers.length} in unsplash service...`);
        }

        if (!type || type === WALLPAPER_TYPE.video) {
            const halfCount = Math.ceil((count || 1) / 2);

            const [pexelsWallpapers, pixabayWallpapers] = await Promise.all([
                this.pexelsService.getRandom(query, halfCount),
                this.pixabayService.getRandom(query, halfCount),
            ]);

            wallpapers = [...wallpapers, ...pexelsWallpapers, ...pixabayWallpapers];

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
                    addWallpapers = await this.pixabayService.getRandom(query, addCount);
                    this.logger.log(`Found ${addWallpapers.length} in pixabay service...`);
                } else {
                    this.logger.log(
                        `Not enough results. Request additional ${addCount} wallpapers pexels from service...`,
                    );
                    addWallpapers = await this.pexelsService.getRandom(query, addCount);
                    this.logger.log(`Found ${addWallpapers.length} in pexels service...`);
                }

                wallpapers = [...wallpapers, ...addWallpapers];
            }
        }

        return wallpapers.sort(() => Math.random() - 0.5).slice(0, count);
    }

    async getWallpaper(service: service, idInService: string): Promise<Wallpaper> {
        let wallpaper = await this.wallpaperCacheModel.findOne({
            id: encodeInternalId({
                idInService,
                service,
            }),
        });

        if (!wallpaper) {
            wallpaper = await this.services[service].getById(idInService);

            await this.saveToCache(wallpaper);
        }

        return wallpaper;
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

    @Interval(60 * 1000)
    async handleCheckRates() {
        this.logger.log('Start checking wallpapers rates...');

        try {
            const dislikeRates = await this.rateModel.find({
                rate: rate.dislike,
            });

            if (dislikeRates.length < 5) {
                this.logger.log(`Few wallpaper rates. Skip checking`);

                return;
            }

            const ratesByWallpaper = {};

            dislikeRates.forEach((rate) => {
                if (!(rate.id in ratesByWallpaper))
                    ratesByWallpaper[rate.id] = {
                        service: rate.service,
                        idInService: rate.idInService,
                        count: 0,
                    };

                ratesByWallpaper[rate.id].count += 1;
            });

            const blocked = (
                await Promise.all(
                    Object.keys(ratesByWallpaper).map(async (wallpaperId) => {
                        const wallpaperRate = ratesByWallpaper[wallpaperId];

                        if (wallpaperRate.count > 5) {
                            const wallpaper = await this.getWallpaper(wallpaperRate.service, wallpaperRate.idInService);

                            return {
                                id: wallpaperId,
                                idInService: wallpaper.idInService,
                                service: wallpaper.service,
                                sourceLink: wallpaper.sourceLink,
                                blockedType: BLOCKED_TYPE.wallpaper,
                            };
                        } else {
                            return null;
                        }
                    }),
                )
            ).filter((isExist) => isExist);

            await this.blackListWallpaperModel.insertMany(blocked);

            this.logger.log(
                `The wallpapers rates has been checked
                Result:
                Blocked: ${blocked.length}`,
            );
        } catch (e) {
            this.logger.error(e);
        }
    }

    @Interval(60 * 1000) // Clear cache every 1m
    async handleClearCache() {
        this.logger.log('Start clearing obsolete wallpaper cache...');

        try {
            const sitesRemove = await this.wallpaperCacheModel.find({
                createDate: {
                    $lte: new Date(),
                },
            });

            await this.wallpaperCacheModel.deleteMany({
                createDate: {
                    $lte: new Date(),
                },
            });
            const count = await this.wallpaperCacheModel.count();

            this.logger.log(
                `The wallpapers cache has been cleared
                Result:
                Removed outdated: ${sitesRemove.length}
                In cache:         ${count}`,
            );
        } catch (e) {
            this.logger.error(e);
        }
    }
}
