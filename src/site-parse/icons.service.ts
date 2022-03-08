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
import { pick, isEqual } from 'lodash';
import { SiteSchema } from '@/site-parse/schemas/site';
import { ConfigService } from '@nestjs/config';
import { SITE_IMAGE_TYPE } from '@/site-parse/entities/siteImage';
import { createCanvas } from 'canvas';

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

    async addBounds(imageCanvas, safeZone) {
        const metadata = await Sharp(await imageCanvas.toBuffer()).metadata();

        const canvas = createCanvas(metadata.width, metadata.height);
        const ctx = canvas.getContext('2d');

        ctx.strokeStyle = 'rgba(169,20,255,0.5)';
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.rect(0.5, 0.5, metadata.width - 1, metadata.height - 1);
        ctx.stroke();
        ctx.rect(8 + 0.5, 8 + 0.5, metadata.width - 16 - 1, metadata.height - 16 - 1);
        ctx.stroke();

        if (safeZone !== null) {
            ctx.strokeStyle = 'rgba(115,255,0,1)';
            ctx.beginPath();
            ctx.lineWidth = 1;
            ctx.rect(
                safeZone + 0.5,
                safeZone + 0.5,
                metadata.width - safeZone * 2 - 1,
                metadata.height - safeZone * 2 - 1,
            );
            ctx.stroke();
        }

        const buffer = canvas.toBuffer();

        return imageCanvas.composite([{ input: buffer }]);
    }

    async checkSafeZone(canvas) {
        const clone = canvas.clone();

        const metadata = await Sharp(await clone.toBuffer()).metadata();
        const data = Array.from(await clone.raw().toBuffer());

        const getPixel = (offset) => ({
            r: data[offset * metadata.channels],
            g: data[offset * metadata.channels + 1],
            b: data[offset * metadata.channels + 2],
            a: metadata.channels === 4 ? data[offset * metadata.channels + 3] : 255,
        });

        const pixelsCount = metadata.width * metadata.height;

        const pixels = [];
        let level = 0;
        let isNormal = true;
        let isSuperNormal = true;
        let safeColor = null;
        let isSuperEmpty = true;

        do {
            pixels.length = 0;

            for (let x = level; x < metadata.width - level * 2; x++) {
                pixels.push(getPixel(x + level * metadata.width));
                pixels.push(getPixel(pixelsCount - level * metadata.width - x - 1));
            }

            for (let y = level + 1; y < metadata.height - level * 2 - 2; y++) {
                pixels.push(getPixel(metadata.width * y + level));
                pixels.push(getPixel(metadata.width * y + metadata.width - level - 1));
            }

            const colorsPalette = [];
            const colorsCount = [];

            pixels.forEach((color) => {
                const nearColorIndex = colorsPalette.findIndex((checkColor) => {
                    return (
                        Math.abs(checkColor.a - color.a) < 90 ||
                        (Math.abs(checkColor.r - color.r) < 75 &&
                            Math.abs(checkColor.g - color.g) < 75 &&
                            Math.abs(checkColor.b - color.b) < 75 &&
                            Math.abs(checkColor.a - color.a) < 170)
                    );
                });

                if (nearColorIndex === -1) {
                    colorsPalette.push(color);
                    colorsCount.push(1);
                } else {
                    colorsCount[nearColorIndex] += 1;
                }
            });

            const colorsPaletteSorted = [];
            const colorsCountSorted = [];
            let wholePixels = 0;

            colorsCount.forEach(() => {
                let indexMax;
                let colorMax = 0;

                colorsCount.forEach((color, index) => {
                    if (color >= colorMax) {
                        indexMax = index;
                        colorMax = color;
                    }
                });

                colorsCountSorted.push(colorsCount[indexMax]);
                colorsPaletteSorted.push(colorsPalette[indexMax]);
                wholePixels += colorsCount[indexMax];

                colorsCount[indexMax] = -1;
            });

            console.log(
                `level: ${level} colorsPalette:`,
                colorsPaletteSorted,
                ' colorsCount:',
                colorsCountSorted,
                ' wholePixels:',
                wholePixels,
            );

            if (safeColor) {
                const safeColorIndex = colorsPaletteSorted.findIndex((color) => isEqual(color, safeColor));

                if (safeColorIndex !== -1) {
                    isNormal = colorsCountSorted[safeColorIndex] / wholePixels >= (isSuperNormal ? 0.85 : 0.5);

                    console.log('Safe check:', {
                        isNormal,
                        isSuperNormal,
                        safeColor: colorsPaletteSorted[safeColorIndex],
                    });

                    if (isNormal || !isSuperNormal) {
                        level += 1;
                    }
                } else {
                    isNormal = false;
                }

                continue;
            }

            level += 1;

            safeColor = colorsPaletteSorted[0];
            isNormal = colorsCountSorted[0] / wholePixels >= 0.7;
            isSuperNormal = colorsCountSorted[0] / wholePixels >= 0.8;

            if (isSuperNormal && safeColor.a > 230) {
                isNormal = false;
            }

            isSuperEmpty = isSuperNormal && isSuperEmpty && safeColor.a === 0;

            console.log('Default check:', { isNormal, isSuperNormal, safeColor, isSuperEmpty });
        } while (level <= 9 && isNormal);

        if (isSuperEmpty && level === 10) {
            return null;
        }

        if (level === 1 && !isSuperEmpty) return null;

        return level - 1;
    }

    async getRecommendedTypes(imageCanvas, preferType) {
        const metadata = await imageCanvas.metadata();

        const ratio = metadata.width / metadata.height;

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

        return recommendedTypes;
    }

    toCover(canvas) {
        this.logger.log(`Convert icon to cover`);
        return canvas.resize(210 * 2, 210 * 2);
    }

    toPoster(canvas) {
        this.logger.log(`Convert icon to poster`);
        return canvas.resize(210 * 2, 110 * 2);
    }

    toIcon(canvas) {
        this.logger.log(`Convert icon to icon`);
        return canvas.resize(40 * 2, 40 * 2);
    }

    toSmallIcon(canvas) {
        this.logger.log(`Convert icon to small-icon`);
        return canvas.resize(40 * 2, 40 * 2).blur(30);
    }

    async processingImage(url: string, preferType = 'unknown', bounds = false): Promise<any> {
        console.time('pre parse icon');
        const { data, request } = await firstValueFrom(this.httpService.get(url, { responseType: 'arraybuffer' }));

        let buffer = data;
        let type: string;
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

        const recommendedTypes = await this.getRecommendedTypes(canvas, preferType);

        switch (recommendedTypes[0]) {
            case SITE_IMAGE_TYPE.cover:
                canvas = this.toCover(canvas);
                type = SITE_IMAGE_TYPE.cover;
                score = Math.min(Math.round((metadata.width + metadata.height) / 8), 300);
                break;
            case SITE_IMAGE_TYPE.poster:
                canvas = this.toPoster(canvas);
                type = SITE_IMAGE_TYPE.poster;
                score = Math.min(Math.round((metadata.width + metadata.height) / 8), 300);
                break;
            case SITE_IMAGE_TYPE.icon:
                canvas = this.toIcon(canvas);
                type = SITE_IMAGE_TYPE.icon;
                score = Math.min(Math.round((metadata.width + metadata.height) / 2), 140);
                break;
            default:
                canvas = this.toSmallIcon(canvas);
                type = SITE_IMAGE_TYPE.small_icon;
                score = Math.round((metadata.width + metadata.height) / 2);
                break;
        }

        const safeZone = await this.checkSafeZone(canvas);

        if (bounds) {
            canvas = await this.addBounds(canvas, safeZone);
        }

        if (metadata.format === 'svg') {
            score += 100;
        }

        const processingData = await canvas.png().toBuffer();

        console.timeEnd('pre parse icon');

        return {
            baseUrl: url,
            score,
            type,
            recommendedTypes,
            width: metadata.width,
            height: metadata.height,
            safeZone,
            data: processingData,
        };
    }

    async saveImageToCache(image): Promise<void> {
        const name = hash(`${image.type || 'unknown'}/${image.baseUrl}`);

        await fs.outputFile(`cache/images/${name}.png`, image.data);

        await this.siteImageModel.create({
            fileName: name,
            baseUrl: image.baseUrl,
            score: image.score,
            type: image.type,
            recommendedTypes: image.recommendedTypes || [],
            width: image.width,
            height: image.height,
            safeZone: image.safeZone,
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
            safeZone: dbRow.safeZone,
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
