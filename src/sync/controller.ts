import { Body, Controller, Get, HttpStatus, Logger, Post, Request, Res, UseGuards } from '@nestjs/common';
import { SyncService } from './service';
import { JwtDeviceAuthGuard } from '@/auth/strategies/jwt/auth.guard';

@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly syncService: SyncService) {}

    @UseGuards(JwtDeviceAuthGuard)
    @Get('cloud-state')
    async cloudSync(@Request() req) {
        this.logger.log('Get cloud state for user', req.user);
    }

    @UseGuards(JwtDeviceAuthGuard)
    @Post('push')
    async push(@Request() req, @Body() body, @Res() response) {
        this.logger.log('Push state', req.user, body);

        response.status(HttpStatus.OK).send();
    }

    @UseGuards(JwtDeviceAuthGuard)
    @Get('commit')
    async commit(@Request() req) {
        this.logger.log('Commit state', req.user);
    }
}
