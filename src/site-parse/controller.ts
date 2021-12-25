import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import { SiteParseService } from './site.service';
import { Site } from './entities/site';
import { Readable } from 'stream';
import hash from '@/utils/hash';
import { IconsProcessingService } from './icons.service';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';

@Controller('v1/site-parse')
export class SiteParseController {
    private readonly logger = new Logger(SiteParseController.name);

    constructor(
        private readonly siteParseService: SiteParseService,
        private readonly iconsProcessingService: IconsProcessingService,
    ) {}

    // @UseGuards(JwtAccessAuthGuard)
    @Get('get-meta')
    async getMeta(@Query() query): Promise<Site> {
        this.logger.log(`Start parse site '${query.url}'...`);

        let site = await this.siteParseService.getSiteFromCache(query.url);

        if (!site) {
            site = await this.siteParseService.parseSite(query.url);

            await this.siteParseService.saveSiteToCache(site);
        } else {
            this.logger.log(`Find site '${query.url}' in cache`);
        }

        const images = site.images.map((image) => image.baseUrl);

        const imagesFromCache = await this.iconsProcessingService.getImagesMetaFromCache(images);

        const finalImages = site.images
            .map((image) => {
                const imageFromCache = imagesFromCache.find((cahceImage) => cahceImage.baseUrl === image.baseUrl);

                if (imageFromCache) {
                    return {
                        url: `/site-parse/processing-image?url=${encodeURIComponent(imageFromCache.baseUrl)}`,
                        baseUrl: imageFromCache.baseUrl,
                        width: imageFromCache.width,
                        height: imageFromCache.height,
                        score: imageFromCache.score,
                        type: imageFromCache.type,
                    };
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
            });

        return { ...site, images: finalImages };
    }

    // @UseGuards(JwtAccessAuthGuard)
    @Get('processing-image')
    async processingImage(@Query() query, @Res() response): Promise<void> {
        this.logger.log(`Processing image by url: '${query.url}'`);
        const name = hash(query.url);

        let image = await this.iconsProcessingService.getImageFromCache(name);

        if (!image) {
            this.logger.log(`Not find image in cache. Processing...`);
            image = await this.iconsProcessingService.processingImage(query.url);

            await this.iconsProcessingService.saveImageToCache(image);
        } else {
            this.logger.log(`Find image in cache with name '${name}'`);
        }

        response.set({
            'Content-Type': 'image/png',
            'Accept-Ranges': 'bytes',
            'Content-Length': Buffer.byteLength(image.data),
            'Image-Type': image.type,
            'Image-Score': image.score,
            'Image-Base-Url': image.baseUrl,
        });

        Readable.from(image.data).pipe(response);
    }
}
