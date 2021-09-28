import { Controller, Get, Logger, Request, UseGuards } from '@nestjs/common';
import { SyncService } from './service';
import { JwtAuthGuard } from '@/auth/strategies/jwt/auth.guard';

@Controller('sync')
export class SyncController {
    private readonly logger = new Logger(SyncController.name);

    constructor(private readonly syncService: SyncService) {}

    @UseGuards(JwtAuthGuard)
    @Get('cloud-state')
    async cloudSync(@Request() req) {
        this.logger.log('Get cloud state for user', req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('push')
    async push(@Request() req) {
        this.logger.log('Push state', req.user);

        return ['test'];
    }

    @UseGuards(JwtAuthGuard)
    @Get('commit')
    async commit(@Request() req) {
        this.logger.log('Commit state', req.user);
    }
}
