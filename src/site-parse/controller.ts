import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { SiteParseService } from './service';
import { Site } from './entities/site';
import { Readable } from 'stream';
import hash from './../utils/hash';

@Controller('site-parse')
export class SiteParseController {
    private readonly logger = new Logger(SiteParseController.name);
    constructor(private readonly siteParseService: SiteParseService) {}

    @Get('get-meta')
    async getMeta(@Query() query): Promise<Site> {
        this.logger.log(`Start parse site '${query.url}'...`);
        try {
            return await this.siteParseService.parseSite(query.url);
        } catch (e) {
            this.logger.error(e);
        }
    }

    @Get('processing-image')
    async processingImage(@Query() query, @Res() response): Promise<void> {
        this.logger.log(`Processing image by url: '${query.url}'`);
        const name = hash(query.url);

        let image = await this.siteParseService.getImageFromCache(name);

        if (!image) {
            this.logger.log(`Not find image in cache. Processing...`);
            image = await this.siteParseService.processingImage(query.url);

            await this.siteParseService.saveImageToCache(image);
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
