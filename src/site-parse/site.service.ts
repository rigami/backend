import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { JSDOM } from 'jsdom';
import { SiteImage } from './entities/siteImage';
import { SiteSchema } from './schemas/site';
import { Site } from './entities/site';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { Interval } from '@nestjs/schedule';
import { SiteImageSchema } from './schemas/siteImage';

function getAttr(node, attrName) {
    return node.attributes.getNamedItem(attrName)?.textContent;
}

@Injectable()
export class SiteParseService {
    private readonly logger = new Logger(SiteParseService.name);

    constructor(
        private httpService: HttpService,
        @InjectModel(SiteSchema)
        private readonly siteModel: ReturnModelType<typeof SiteSchema>,
        @InjectModel(SiteImageSchema)
        private readonly siteImageModel: ReturnModelType<typeof SiteImageSchema>,
    ) {}

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
                        type: 'unknown',
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

                                const ratio = image.width / image.height;
                                const wScore = (1 / Math.abs(image.width - 100)) * (image.width > 100 ? 400 : 100);
                                const hScore = (1 / Math.abs(image.height - 100)) * (image.height > 100 ? 400 : 100);

                                if (ratio !== 1 && image.width >= 210) {
                                    image.type = 'poster';
                                } else if (ratio === 1 && image.width >= 40) {
                                    image.type = 'icon';
                                } else {
                                    image.type = 'small-icon';
                                }

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

    async saveSiteToCache(site: Site): Promise<void> {
        const saveSite = {
            url: site.url,
            rootUrl: site.rootUrl,
            protocol: site.protocol,
            host: site.host,
            title: site.title,
            description: site.description,
            images: site.images.map((icon) => ({
                baseUrl: icon.baseUrl,
                width: icon.width,
                height: icon.height,
                score: icon.score,
                type: icon.type,
            })),
        };

        await this.siteModel.create(saveSite);
        this.logger.log(`Saved site '${site.url}' to cache`);
    }

    async getSiteFromCache(url: string): Promise<Site> {
        const site = await this.siteModel.findOne({ url });

        if (site) {
            console.log('images:', site.images);

            return {
                url: site.url,
                rootUrl: site.rootUrl,
                protocol: site.protocol,
                host: site.host,
                title: site.title,
                description: site.description,
                images: site.images.map(
                    (image): SiteImage => ({
                        url: `http://localhost:8080/site-parse/processing-image?url=${encodeURIComponent(
                            image.baseUrl,
                        )}`,
                        baseUrl: image.baseUrl,
                        width: image.width,
                        height: image.height,
                        score: image.score,
                        type: image.type,
                    }),
                ),
            };
        }

        return null;
    }

    @Interval(60 * 1000) // Clear cache every 1m
    async handleClearCache() {
        this.logger.log('Start clearing obsolete site cache...');

        try {
            const sitesRemove = await this.siteModel.find({
                createDate: {
                    $lte: new Date(),
                },
            });

            await this.siteModel.deleteMany({
                createDate: {
                    $lte: new Date(),
                },
            });
            const count = await this.siteModel.count();

            this.logger.log(
                `The sites cache has been cleared
                Result:
                Removed outdated: ${sitesRemove.length}
                In cache:         ${count}`,
            );
        } catch (e) {
            this.logger.error(e);
        }
    }
}
