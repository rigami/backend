import { Controller, Get, Query, Res } from '@nestjs/common';
import { SiteParseService } from './service';
import { Site } from './entities/site';
import { Readable } from 'stream';

@Controller('site-parse')
export class SiteParseController {
    constructor(private readonly siteParseService: SiteParseService) {}

    @Get('get-meta')
    async getMeta(@Query() query): Promise<Site> {
        return await this.siteParseService.parseSite(query.url);
    }

    @Get('processing-image')
    async processingImage(@Query() query, @Res() response): Promise<void> {
        const image = await this.siteParseService.processingImage(query.url);

        response.set({
            'Content-Type': 'image/jpeg',
            'Accept-Ranges': 'bytes',
            'Content-Length': Buffer.byteLength(image.data),
            'Image-Type': image.type,
            'Image-Score': image.score,
            'Image-Base-Url': image.baseUrl,
        });

        Readable.from(image.data).pipe(response);
    }
}
