import { Controller, Logger } from '@nestjs/common';

@Controller('v1/wallpapers/black-list')
export class BlackListWallpapersController {
    private readonly logger = new Logger(BlackListWallpapersController.name);
}
