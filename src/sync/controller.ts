import { Body, Controller, Get, HttpStatus, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { CurDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { SyncService } from './service';
import { PullRequestEntity } from './entities/request.pull';
import { PushRequestEntity } from './entities/request.push';
import { PullResponseEntity } from './entities/response.pull';
import { Response } from 'express';
import { CheckUpdateRequestEntity } from './entities/request.checkUpdate';
import { CheckUpdateResponseEntity } from './entities/response.checkUpdate';
import { Res } from '@/utils/response.param.decorator';
import { PushResponseEntity } from './entities/response.push';

@Controller('v1/sync')
export class SyncController {
    constructor(private syncService: SyncService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Put('push')
    async setState(
        @Body() pushInfo: PushRequestEntity,
        @CurUser() user: User,
        @CurDevice() device: Device,
    ): Promise<PushResponseEntity> {
        return await this.syncService.pushState(pushInfo, user, device);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('check-update')
    async checkUpdate(
        @Query() checkUpdateInfo: CheckUpdateRequestEntity,
        @CurUser() user: User,
    ): Promise<CheckUpdateResponseEntity> {
        return this.syncService.checkUpdate(checkUpdateInfo, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('pull')
    async getCurrentState(
        @Query() pullInfo: PullRequestEntity,
        @CurUser() user: User,
        @CurDevice() device: Device,
        @Res() response: Response,
    ): Promise<PullResponseEntity> {
        const changes = await this.syncService.pullState(pullInfo, user, device);

        if (changes) {
            return changes;
        }

        response.status(HttpStatus.NOT_MODIFIED);
    }
}
