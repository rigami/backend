import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';
import { SiteImage } from './entities/siteImage';
import { Site } from './entities/site';
import Sharp from 'sharp';
import icoToPng from 'ico-to-png';

function getAttr(node, attrName) {
    return node.attributes.getNamedItem(attrName)?.textContent;
}

async function ResizedSharp(
    p: string | Buffer,
    { width, height }: { width?: number; height?: number },
): Sharp {
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

    return Sharp(p, { density: Math.max(wDensity, hDensity) }).resize(
        width,
        height,
    );
}

@Injectable()
export class SiteParseService {
    constructor(private httpService: HttpService) {}

    async parseSite(url: string): Promise<Site> {
        const { data, request } = await firstValueFrom(
            this.httpService.get(url),
        );

        const { document } = new JSDOM(data).window;
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
                            if (separator === -1)
                                throw new Error('Is not size');

                            image.width = +size.substring(0, separator);
                            image.height = +size.substring(separator + 1);

                            const wScore =
                                (1 / Math.abs(image.width - 100)) *
                                (image.width > 100 ? 400 : 100);
                            const hScore =
                                (1 / Math.abs(image.height - 100)) *
                                (image.height > 100 ? 400 : 100);

                            image.score += wScore;
                            image.score += hScore;
                        } catch (e) {
                            console.error(e);
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
                url: `http://localhost:8080/site-parse/processing-image?url=${encodeURIComponent(
                    image.baseUrl,
                )}`,
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
    }

    async processingImage(url: string): Promise<any> {
        const { data, request } = await firstValueFrom(
            this.httpService.get(url, { responseType: 'arraybuffer' }),
        );

        let buffer = data;
        let type;
        let score = 0;

        if (request.res.headers['content-type'] === 'image/x-icon') {
            buffer = await icoToPng(data, 80);
        }

        let canvas = await ResizedSharp(buffer, { width: 80, height: 80 });

        const metadata = await canvas.metadata();

        console.log('metadata:', metadata);

        const ratio = metadata.width / metadata.height;

        if (ratio !== 1 && metadata.width >= 210) {
            // Big poster
            canvas = canvas.resize(210 * 2, 110 * 2);
            type = 'poster';
            score = Math.min(
                Math.round((metadata.width + metadata.height) / 8),
                300,
            );
        } else if (
            (ratio === 1 && metadata.width >= 40) ||
            metadata.format === 'svg'
        ) {
            // Big icon
            canvas = canvas.resize(40 * 2, 40 * 2);
            type = 'icon';
            score = Math.min(
                Math.round((metadata.width + metadata.height) / 2),
                140,
            );
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
}
