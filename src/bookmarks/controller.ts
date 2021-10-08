import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/utils/currentUser.param.decorator';
import { BookmarksService } from '@/bookmarks/service';
import { CurrentDevice } from '@/auth/utils/currentDevice.param.decorator';
import { Device } from '@/devices/entities/device';
import { User } from '@/users/entities/user';
import { State } from '@/bookmarks/entities/state';

@Controller('v1/bookmarks')
export class BookmarksController {
    constructor(private bookmarksService: BookmarksService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('state/pull')
    async getCurrentState(@Query('commit') commit: string, @CurrentUser() user: User, @CurrentDevice() device: Device) {
        return this.bookmarksService.pullState(commit, user, device);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Put('state/push')
    async setState(@Body() state: State, @CurrentUser() user, @CurrentDevice() device: Device) {
        return this.bookmarksService.pushState(state, user, device);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('state/check-update')
    async checkUpdate(@Query('commit') commit: string, @CurrentUser() user) {
        return this.bookmarksService.checkUpdate(commit, user);
    }
}
