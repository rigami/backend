import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DOMWindow, JSDOM } from 'jsdom';
import { SiteImage } from './entities/siteImage';
import { SiteImage as SiteImageScheme } from './schemas/siteImage';
import { Site } from './entities/site';
import Sharp from 'sharp';
import icoToPng from 'ico-to-png';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import hash from '../utils/hash';
import fs from 'fs-extra';
import { Interval } from '@nestjs/schedule';
import { pick } from 'lodash';

function getAttr(node, attrName) {
    return node.attributes.getNamedItem(attrName)?.textContent;
}

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
export class SiteParseService {
    private readonly logger = new Logger(SiteParseService.name);

    constructor(
        private httpService: HttpService,
        @InjectModel(SiteImageScheme)
        private readonly siteImageModel: ReturnModelType<typeof SiteImageScheme>,
    ) {
        siteImageModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            fs.remove('cache/images')
                .then(() => {
                    this.logger.warn('Drop icons cache! Because set development mode');
                })
                .catch((err) => this.logger.error(err));
        });
    }

    async parseSite(url: string): Promise<Site> {
        let request: any;
        let rawData: string;

        try {
            const response = await firstValueFrom(this.httpService.get(url));

            request = response.request;
            rawData = response.data;
        } catch (e) {
            throw new Error(`The site is not available (${e.message})`);
        }

        try {
            const document: Document = new JSDOM(rawData).window.document;

            const head = document.head;

            const title = head.querySelector('title')?.textContent;
            const description = head
                .querySelector("meta[name='description']")
                .attributes.getNamedItem('content').textContent;

            const imageElements = head.querySelectorAll(
                `
                    [rel='shortcut icon'],
                    [rel='shortcut'],
                    [rel='apple-touch-icon'],
                    [itemprop='image'],
                    [rel='icon'],
                    [property='og:image'],
                    [name='og:image'],
                    [rel='image_src'],
                    [property='twitter:image'],
                    [name='twitter:image'],
                    [name='yandex-tableau-widget'],
                    [name='msapplication-TileImage']
                `,
            );

            const images = Array.from(imageElements)
                .map((element) => {
                    const image: SiteImage = {
                        url: '',
                        baseUrl: '',
                        width: undefined,
                        height: undefined,
                        score: 0,
                    };

                    if (element.tagName.toLowerCase() === 'meta') {
                        image.baseUrl = getAttr(element, 'content');
                    } else if (element.tagName.toLowerCase() === 'link') {
                        image.baseUrl = getAttr(element, 'href');

                        const size = getAttr(element, 'sizes');
                        if (size && size !== '' && size !== 'any') {
                            try {
                                const separator = size.indexOf('x');
                                if (separator === -1) throw new Error('Is not size');

                                image.width = +size.substring(0, separator);
                                image.height = +size.substring(separator + 1);

                                const wScore = (1 / Math.abs(image.width - 100)) * (image.width > 100 ? 400 : 100);
                                const hScore = (1 / Math.abs(image.height - 100)) * (image.height > 100 ? 400 : 100);

                                image.score += wScore;
                                image.score += hScore;
                            } catch (e) {
                                this.logger.error(e);
                            }
                        }
                    } else {
                        return null;
                    }

                    return image;
                })
                .sort((imageA, imageB) => {
                    if (imageA.score > imageB.score) {
                        return -1;
                    } else if (imageA.score < imageB.score) {
                        return 1;
                    }

                    return 0;
                })
                .map((image) => ({
                    ...image,
                    url: `http://localhost:8080/site-parse/processing-image?url=${encodeURIComponent(image.baseUrl)}`,
                }));

            return {
                url,
                protocol: request.protocol,
                host: request.host,
                rootUrl: `${request.protocol}//${request.host}`,
                title,
                description,
                images,
            };
        } catch (e) {
            throw new Error(`Broken DOM (${e.message})`);
        }
    }

    async processingImage(url: string): Promise<any> {
        const { data, request } = await firstValueFrom(this.httpService.get(url, { responseType: 'arraybuffer' }));

        let buffer = data;
        let type;
        let score = 0;

        if (request.res.headers['content-type'] === 'image/x-icon') {
            buffer = await icoToPng(data, 80);
        }

        let canvas = await ResizedSharp(buffer, { width: 80, height: 80 });

        const metadata = await canvas.metadata();

        this.logger.log(
            `Processing icon '${url}'. Metadata: ${JSON.stringify(pick(metadata, ['format', 'width', 'height']))}`,
        );

        const ratio = metadata.width / metadata.height;

        if (ratio !== 1 && metadata.width >= 210) {
            // Big poster
            canvas = canvas.resize(210 * 2, 110 * 2);
            type = 'poster';
            score = Math.min(Math.round((metadata.width + metadata.height) / 8), 300);
        } else if ((ratio === 1 && metadata.width >= 40) || metadata.format === 'svg') {
            // Big icon
            canvas = canvas.resize(40 * 2, 40 * 2);
            type = 'icon';
            score = Math.min(Math.round((metadata.width + metadata.height) / 2), 140);
        } else {
            // Small icon
            canvas = canvas.resize(40 * 2, 40 * 2).blur(30);
            type = 'small-icon';
            score = Math.round((metadata.width + metadata.height) / 2);
        }

        if (metadata.format === 'svg') {
            score += 100;
        }

        const processingData = await canvas.png().toBuffer();

        return {
            baseUrl: url,
            score,
            type,
            data: processingData,
        };
    }

    async saveImageToCache(image): Promise<void> {
        const name = hash(image.baseUrl);

        await fs.outputFile(`cache/images/${name}.png`, image.data);

        await this.siteImageModel.create({
            fileName: name,
            baseUrl: image.baseUrl,
            score: image.score,
            type: image.type,
            createDate: new Date(),
        });
        this.logger.log(`Saved image '${image.baseUrl}' to cache with name '${name}'`);
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
            data: processingData,
            createDate: dbRow.createDate,
        };
    }

    @Interval(60 * 1000) // Clear icons cache every 1m
    async handleClearCache() {
        this.logger.log('Start clearing obsolete icons cache...');

        try {
            const removeRows = await this.siteImageModel.find({
                createDate: {
                    $lte: new Date(),
                },
            });

            await this.siteImageModel.deleteMany({
                createDate: {
                    $lte: new Date(),
                },
            });

            await Promise.all(removeRows.map((row) => fs.remove(`cache/images/${row.fileName}.png`)));

            this.logger.log(`The cache has been cleared. Removed ${removeRows.length} outdated icons`);
        } catch (e) {
            this.logger.error(e);
        }
    }
}
