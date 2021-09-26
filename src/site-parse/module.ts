import { Module } from '@nestjs/common';
import { SiteParseService } from './site.service';
import { SiteParseController } from './controller';
import { HttpModule } from '@nestjs/axios';
import { TypegooseModule } from 'nestjs-typegoose';
import { SiteImage } from './schemas/siteImage';
import { Site } from './schemas/site';
import { IconsProcessingService } from './icons.service';

@Module({
    imports: [
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
        TypegooseModule.forFeature([SiteImage, Site]),
    ],
    providers: [SiteParseService, IconsProcessingService],
    controllers: [SiteParseController],
    exports: [SiteParseService],
})
export class SiteParseModule {}
