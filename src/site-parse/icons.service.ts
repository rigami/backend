import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SiteImageSchema } from './schemas/siteImage';
import Sharp from 'sharp';
import icoToPng from 'ico-to-png';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import hash from '@/utils/hash';
import fs from 'fs-extra';
import { Interval } from '@nestjs/schedule';
import { pick } from 'lodash';
import { SiteSchema } from '@/site-parse/schemas/site';
import { ConfigService } from '@nestjs/config';
import { SITE_IMAGE_TYPE } from '@/site-parse/entities/siteImage';

async function ResizedSharp(p: string | Buffer, { width, height }: { width?: number; height?: number }): Sharp {
    const instance = Sharp(p);

    const metadata = await instance.metadata();

    const initDensity = metadata.density ?? 72;

    if (metadata.format !== 'svg') {
        return instance;
    }

    let wDensity = 0;
    let hDensity = 0;
    if (width && metadata.width) {
        wDensity = (initDensity * width) / metadata.width;
    }

    if (height && metadata.height) {
        hDensity = (initDensity * height) / metadata.height;
    }

    if (!wDensity && !hDensity) {
        // both width & height are not present and/or
        // can't detect both metadata.width & metadata.height
        return instance;
    }

    return Sharp(p, { density: Math.max(wDensity, hDensity) }).resize(width, height);
}

@Injectable()
export class IconsProcessingService {
    private readonly logger = new Logger(IconsProcessingService.name);

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        @InjectModel(SiteSchema)
        private readonly siteModel: ReturnModelType<typeof SiteSchema>,
        @InjectModel(SiteImageSchema)
        private readonly siteImageModel: ReturnModelType<typeof SiteImageSchema>,
    ) {}

    async processingImage(url: string, preferType = 'unknown'): Promise<any> {
        console.time('pre parse icon');
        const { data, request } = await firstValueFrom(this.httpService.get(url, { responseType: 'arraybuffer' }));

        let buffer = data;
        let type: string = preferType;
        let score: number;

        if (request.res.headers['content-type'] === 'image/x-icon') {
            buffer = await icoToPng(data, 80);
        }

        let canvas = await ResizedSharp(buffer, { width: 80, height: 80 });

        const metadata = await canvas.metadata();

        this.logger.log(
            `Processing icon url:'${url}' preferType:${preferType}. Metadata: ${JSON.stringify(
                pick(metadata, ['format', 'width', 'height']),
            )}`,
        );

        console.timeLog('pre parse icon');

        const ratio = metadata.width / metadata.height;

        const toCover = () => {
            this.logger.log(`Convert icon url:'${url}' to cover`);
            canvas = canvas.resize(210 * 2, 210 * 2);
            type = SITE_IMAGE_TYPE.cover;
            score = Math.min(Math.round((metadata.width + metadata.height) / 8), 300);
        };

        const toPoster = () => {
            this.logger.log(`Convert icon url:'${url}' to poster`);
            canvas = canvas.resize(210 * 2, 110 * 2);
            type = SITE_IMAGE_TYPE.poster;
            score = Math.min(Math.round((metadata.width + metadata.height) / 8), 300);
        };

        const toIcon = () => {
            this.logger.log(`Convert icon url:'${url}' to icon`);
            canvas = canvas.resize(40 * 2, 40 * 2);
            type = SITE_IMAGE_TYPE.icon;
            score = Math.min(Math.round((metadata.width + metadata.height) / 2), 140);
        };

        const toSmallIcon = () => {
            this.logger.log(`Convert icon url:'${url}' to small-icon`);
            canvas = canvas.resize(40 * 2, 40 * 2).blur(30);
            type = SITE_IMAGE_TYPE.small_icon;
            score = Math.round((metadata.width + metadata.height) / 2);
        };

        const recommendedTypes = [];

        if (preferType !== 'unknown') {
            recommendedTypes.push(preferType);
        }

        if (ratio <= 1 && metadata.width >= 210) {
            if (!recommendedTypes.includes(SITE_IMAGE_TYPE.cover)) recommendedTypes.push(SITE_IMAGE_TYPE.cover);
        }

        if (ratio >= 1 && metadata.width >= 210) {
            if (!recommendedTypes.includes(SITE_IMAGE_TYPE.poster)) recommendedTypes.push(SITE_IMAGE_TYPE.poster);
        }

        if ((ratio === 1 && metadata.width >= 40) || metadata.format === 'svg') {
            if (!recommendedTypes.includes(SITE_IMAGE_TYPE.icon)) recommendedTypes.push(SITE_IMAGE_TYPE.icon);
        }

        if (!recommendedTypes.includes(SITE_IMAGE_TYPE.small_icon)) {
            recommendedTypes.push(SITE_IMAGE_TYPE.small_icon);
        }

        if (recommendedTypes[0] === SITE_IMAGE_TYPE.cover) {
            toCover();
        } else if (recommendedTypes[0] === SITE_IMAGE_TYPE.poster) {
            toPoster();
        } else if (recommendedTypes[0] === SITE_IMAGE_TYPE.icon) {
            toIcon();
        } else {
            toSmallIcon();
        }

        if (metadata.format === 'svg') {
            score += 100;
        }

        console.timeLog('pre parse icon');

        const processingData = await canvas.png().toBuffer();

        console.timeEnd('pre parse icon');

        return {
            baseUrl: url,
            score,
            type,
            recommendedTypes,
            width: metadata.width,
            height: metadata.height,
            data: processingData,
        };
    }

    async saveImageToCache(image): Promise<void> {
        const name = hash(`${image.type}/${image.baseUrl}`);

        await fs.outputFile(`cache/images/${name}.png`, image.data);

        await this.siteImageModel.create({
            fileName: name,
            baseUrl: image.baseUrl,
            score: image.score,
            type: image.type,
            recommendedTypes: image.recommendedTypes || [],
            width: image.width,
            height: image.height,
        });
        this.logger.log(`Saved image '${image.baseUrl}' to cache with name '${name}'`);
    }

    async getImagesMetaFromCache(urls: string[]): Promise<any> {
        return this.siteImageModel.find({
            baseUrl: { $in: urls },
        });
    }

    async getImageFromCache(name: string): Promise<any> {
        const dbRow = await this.siteImageModel.findOne({
            fileName: name,
        });
        const isExistInCache = dbRow && (await fs.pathExists(`cache/images/${name}.png`));

        if (!isExistInCache) return null;

        const processingData = await fs.readFile(`cache/images/${name}.png`);

        return {
            baseUrl: dbRow.baseUrl,
            score: dbRow.score,
            type: dbRow.type,
            recommendedTypes: dbRow.recommendedTypes,
            width: dbRow.width,
            height: dbRow.height,
            data: processingData,
        };
    }

    @Interval(60 * 1000) // Check cache every 1m
    async handleClearCache() {
        this.logger.log('Start clearing obsolete icons cache...');

        const lifetime = this.configService.get<number>('siteParse.iconsCacheLifetime') || 0;

        try {
            const imagesRemove = await this.siteImageModel.find({
                createDate: {
                    $lte: new Date(Date.now() - lifetime),
                },
            });

            await this.siteImageModel.deleteMany({
                createDate: {
                    $lte: new Date(Date.now() - lifetime),
                },
            });
            const count = await this.siteModel.count();

            await Promise.all(imagesRemove.map((row) => fs.remove(`cache/images/${row.fileName}.png`)));

            this.logger.log(
                `The icons cache has been cleared
                Result:
                Removed outdated: ${imagesRemove.length}
                In cache:         ${count}`,
            );
        } catch (e) {
            this.logger.error(e);
        }
    }
}
