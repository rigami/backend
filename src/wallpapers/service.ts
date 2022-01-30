import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { RateWallpaperSchema } from '@/wallpapers/schemas/rate';
import { RATE } from '@/wallpapers/entities/rate';
import { WALLPAPER_SOURCE, type as WALLPAPER_TYPE, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { User } from '@/auth/users/entities/user';
import { plainToClass } from 'class-transformer';
import base64url from 'base64url';
import { UnsplashService } from '@/wallpapers/modules/unsplash.service';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';
import { PixabayService } from '@/wallpapers/modules/pixabay.service';
import { PexelsService } from '@/wallpapers/modules/pexels.service';
import { Interval } from '@nestjs/schedule';
import { BlockedWallpaperSchema } from '@/wallpapers/schemas/blocked';
import { BLOCKED_METHOD, BLOCKED_TYPE } from '@/wallpapers/entities/blocked';
import { ConfigService } from '@nestjs/config';
import { CollectionWallpaperSchema } from '@/wallpapers/schemas/collection';

export type LiteWallpaper = Pick<Wallpaper, 'idInSource' | 'source'>;

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
    private lastRequestFromNetwork = {};

    constructor(
        private unsplashService: UnsplashService,
        private pixabayService: PixabayService,
        private pexelsService: PexelsService,
        private configService: ConfigService,
        @InjectModel(RateWallpaperSchema)
        private readonly rateModel: ReturnModelType<typeof RateWallpaperSchema>,
        @InjectModel(WallpaperCacheSchema)
        private readonly wallpaperCacheModel: ReturnModelType<typeof WallpaperCacheSchema>,
        @InjectModel(BlockedWallpaperSchema)
        private readonly blackListWallpaperModel: ReturnModelType<typeof BlockedWallpaperSchema>,
        @InjectModel(CollectionWallpaperSchema)
        private readonly collectionWallpaperModel: ReturnModelType<typeof CollectionWallpaperSchema>,
    ) {
        this.services = {
            [WALLPAPER_SOURCE.unsplash]: unsplashService,
            [WALLPAPER_SOURCE.pixabay]: pixabayService,
            [WALLPAPER_SOURCE.pexels]: pexelsService,
        };
    }

    async saveToCache(wallpaper: Wallpaper, query = '') {
        await this.wallpaperCacheModel.findOneAndUpdate(
            { id: wallpaper.id },
            { $set: { ...wallpaper, query } },
            { upsert: true, new: true },
        );
    }

    async checkIsBlocked(wallpaper: Wallpaper, user: User, blockedBy = 'all'): Promise<boolean> {
        if (blockedBy === 'all' || blockedBy === 'system') {
            const blockedBySystem = await this.blackListWallpaperModel.findOne({ id: wallpaper.id });

            // console.log('check system blocked:', blockedBySystem);

            if (blockedBySystem) return true;
        }

        if (blockedBy === 'all' || blockedBy === 'user') {
            const blockedByUser = await this.rateModel.findOne({
                id: wallpaper.id,
                userId: user.id,
                rate: RATE.dislike,
            });

            // console.log('check user blocked:', blockedByUser);

            if (blockedByUser) return true;
        }

        return false;
    }

    async collection(collection: string, count: number, types: WALLPAPER_TYPE[] = [], user: User): Promise<any> {
        this.logger.log(`Search random wallpapers from collection:${collection} count:${count} type:${types}...`);

        let wallpapers = await this.collectionWallpaperModel.aggregate([
            {
                $match: {
                    collectionType: collection,
                    type: types,
                },
            },
            { $sample: { size: count } },
        ]);

        wallpapers = (
            await Promise.all(
                wallpapers.map(async (wallpaper) => {
                    const isBlocked = await this.checkIsBlocked(wallpaper, user, 'all');

                    if (isBlocked) return null;

                    return wallpaper;
                }),
            )
        ).filter(Boolean);

        return wallpapers;
    }

    async search(query: string, count: number, types: WALLPAPER_TYPE[] = [], user: User): Promise<any> {
        this.logger.log(`Search wallpapers query:${query} count:${count} type:${types}...`);

        let wallpapers = [];

        if (types.length === 0 || types.includes(WALLPAPER_TYPE.image)) {
            wallpapers = await this.unsplashService.search(query, count);

            this.logger.log(`Found ${wallpapers.length} in unsplash service...`);
        }

        if (types.length === 0 || types.includes(WALLPAPER_TYPE.video)) {
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

        wallpapers = (
            await Promise.all(
                wallpapers.map(async (wallpaper) => {
                    const isBlocked = await this.checkIsBlocked(wallpaper, user);

                    if (isBlocked) return null;

                    return wallpaper;
                }),
            )
        ).filter(Boolean);

        for await (const wallpaper of wallpapers) {
            await this.saveToCache(wallpaper, query);
        }

        return wallpapers.sort(() => Math.random() - 0.5).slice(0, count);
    }

    async random(
        query: string,
        count: number,
        types: WALLPAPER_TYPE[] = [],
        user: User,
        withoutCache = false,
    ): Promise<any> {
        this.logger.log(`Search random wallpapers query:${query} count:${count} type:${types}...`);

        let wallpapers = [];

        if (!withoutCache) {
            const countInCache = await this.wallpaperCacheModel.find({ query, type: types }).count();
            console.log('countInCache:', countInCache);

            if (countInCache > count * 3) {
                this.logger.log(`Cache warmed up. Getting random wallpapers from cache...`);

                wallpapers = await this.wallpaperCacheModel.aggregate([
                    {
                        $match: {
                            query,
                            type: types,
                        },
                    },
                    { $sample: { size: count } },
                ]);

                const requestDelayThreshold = this.configService.get<number>('wallpapers.requestDelayThreshold') || 0;

                if ((this.lastRequestFromNetwork[query]?.timestamp || 0) + requestDelayThreshold < Date.now()) {
                    this.lastRequestFromNetwork[query] = {
                        timestamp: Date.now(),
                        requestFetch: true,
                    };
                }

                return wallpapers;
            } else {
                this.logger.log(`Cache cold. Getting random wallpapers from network...`);
            }
        }

        this.lastRequestFromNetwork[query] = {
            timestamp: Date.now(),
            requestFetch: false,
        };

        if (types.length === 0 || types.includes(WALLPAPER_TYPE.image)) {
            wallpapers = await this.unsplashService.getRandom(query, count);

            this.logger.log(`Found ${wallpapers.length} in unsplash service...`);
        }

        if (types.length === 0 || types.includes(WALLPAPER_TYPE.video)) {
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

        wallpapers = (
            await Promise.all(
                wallpapers.map(async (wallpaper) => {
                    const isBlocked = await this.checkIsBlocked(wallpaper, user, user ? 'all' : 'system');

                    if (isBlocked) return null;

                    return wallpaper;
                }),
            )
        ).filter(Boolean);

        for await (const wallpaper of wallpapers) {
            await this.saveToCache(wallpaper, query);
        }

        return wallpapers.sort(() => Math.random() - 0.5).slice(0, count);
    }

    async getWallpaper(source: WALLPAPER_SOURCE, idInSource: string): Promise<Wallpaper> {
        this.logger.log(`Get wallpaper source:${source} idInSource:${idInSource}`);

        let wallpaper = await this.wallpaperCacheModel.findOne({
            id: encodeInternalId({
                idInSource,
                source,
            }),
        });

        console.log('wallpaper in cache:', wallpaper);

        if (!wallpaper) {
            wallpaper = await this.services[source].getById(idInSource);
            console.log('wallpaper in network:', wallpaper);

            await this.saveToCache(wallpaper);
        }

        return wallpaper;
    }

    async setRate(id: string, rate: RATE, user: User): Promise<void> {
        this.logger.log('Get info about wallpaper', id);

        console.log(decodeInternalId(id));

        const wallpaper = await this.getWallpaper(decodeInternalId(id).source, decodeInternalId(id).idInSource);

        await this.rateModel.findOneAndUpdate(
            { userId: user.id, id, idInSource: wallpaper.idInSource, source: wallpaper.source },
            {
                $set: {
                    userId: user.id,
                    id,
                    idInSource: wallpaper.idInSource,
                    source: wallpaper.source,
                    type: wallpaper.type,
                    rate,
                },
            },
            { upsert: true, new: true },
        );
    }

    async resetRate(id: string, user: User): Promise<void> {
        await this.rateModel.deleteOne({
            userId: user.id,
            id,
            idInSource: decodeInternalId(id).idInSource,
            source: decodeInternalId(id).source,
        });
    }

    async markDownload(id: string, user: User): Promise<void> {
        const wallpaper = decodeInternalId(id);

        await this.services[wallpaper.source].markDownload(wallpaper);
    }

    @Interval(60 * 1000)
    handleRequest() {
        const requests = Object.keys(this.lastRequestFromNetwork)
            .map((query) => ({
                query,
                ...this.lastRequestFromNetwork[query],
            }))
            .sort((requestA, requestB) => {
                if (requestA.requestFetch && !requestB.requestFetch) {
                    return -1;
                } else if (!requestA.requestFetch && requestB.requestFetch) {
                    return 1;
                }

                if (requestA.timestamp > requestB.timestamp) {
                    return -1;
                } else if (requestA.timestamp < requestB.timestamp) {
                    return 1;
                } else {
                    return 0;
                }
            })
            .filter((request) => request.requestFetch)
            .slice(0, 5);

        requests.forEach((request) => {
            this.logger.log(`Request query:${request.query} to warm up the cache`);

            this.random(request.query, 50, [], null, true).finally(() => {
                this.logger.log(`Request query:${request.query} to warm up the cache is done`);
            });
        });
    }

    @Interval(60 * 1000)
    async handleCheckRates() {
        this.logger.log('Start checking wallpapers rates...');

        const blockingThreshold = this.configService.get<number>('wallpapers.blockingThreshold');

        try {
            const dislikeRates = await this.rateModel.find({
                rate: RATE.dislike,
            });

            if (dislikeRates.length < blockingThreshold) {
                this.logger.log(`Few wallpaper rates. Skip checking`);

                return;
            }

            const ratesByWallpaper = {};

            dislikeRates.forEach((rate) => {
                if (!(rate.id in ratesByWallpaper))
                    ratesByWallpaper[rate.id] = {
                        source: rate.source,
                        idInSource: rate.idInSource,
                        count: 0,
                    };

                ratesByWallpaper[rate.id].count += 1;
            });

            const blocked = (
                await Promise.all(
                    Object.keys(ratesByWallpaper).map(async (wallpaperId) => {
                        const wallpaperRate = ratesByWallpaper[wallpaperId];

                        if (wallpaperRate.count >= blockingThreshold) {
                            const wallpaper = await this.getWallpaper(wallpaperRate.source, wallpaperRate.idInSource);

                            const blockedWallpaper = {
                                id: wallpaperId,
                                idInSource: wallpaper.idInSource,
                                source: wallpaper.source,
                                sourceLink: wallpaper.sourceLink,
                                blockedType: BLOCKED_TYPE.wallpaper,
                                blockedMethod: BLOCKED_METHOD.automatic,
                            };

                            await this.blackListWallpaperModel.findOneAndUpdate(
                                { id: blockedWallpaper.id },
                                { $set: blockedWallpaper },
                                { upsert: true, new: true },
                            );

                            return blockedWallpaper;
                        } else {
                            return null;
                        }
                    }),
                )
            ).filter((isExist) => isExist);

            await this.rateModel.deleteMany({
                id: blocked.map(({ id }) => id),
                rate: RATE.dislike,
            });

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

        const lifetime = this.configService.get<number>('wallpapers.cacheLifetime') || 0;

        try {
            const sitesRemove = await this.wallpaperCacheModel.find({
                createDate: {
                    $lte: new Date(Date.now() - lifetime),
                },
            });

            await this.wallpaperCacheModel.deleteMany({
                createDate: {
                    $lte: new Date(Date.now() - lifetime),
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
