import { Controller, Logger } from '@nestjs/common';

@Controller('v1/wallpapers/collections')
export class CollectionsWallpapersController {
    private readonly logger = new Logger(CollectionsWallpapersController.name);
}
