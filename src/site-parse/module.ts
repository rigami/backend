import { Module } from '@nestjs/common';
import { SiteParseService } from './service';
import { SiteParseController } from './controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    providers: [SiteParseService],
    controllers: [SiteParseController],
    exports: [SiteParseService],
})
export class SiteParseModule {}
