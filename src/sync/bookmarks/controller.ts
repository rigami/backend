import { Body, Controller, Get, HttpStatus, Put, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { BookmarksService } from '@/sync/bookmarks/service';
import { CurrentDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { State } from '@/sync/bookmarks/entities/state';

@Controller('v1/bookmarks')
export class BookmarksController {
    constructor(private bookmarksService: BookmarksService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('state/pull')
    async getCurrentState(
        @Query('commit') commit: string,
        @CurrentUser() user: User,
        @CurrentDevice() device: Device,
        @Res() response,
    ) {
        const changes = await this.bookmarksService.pullState(commit, user, device);

        if (changes) {
            response.send(changes);
        } else {
            response.status(HttpStatus.NOT_MODIFIED).send();
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Put('state/push')
    async setState(@Body() state: State, @CurrentUser() user, @CurrentDevice() device: Device, @Res() response) {
        try {
            const currState = await this.bookmarksService.pushState(state, user, device);

            response.send(currState);
        } catch (e) {
            if (e.message === 'PUL_FIRST') {
                response.status(HttpStatus.AMBIGUOUS).send();
            } else {
                console.error(e);
                throw e;
            }
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('state/check-update')
    async checkUpdate(@Query('commit') commit: string, @CurrentUser() user) {
        return this.bookmarksService.checkUpdate(commit, user);
    }
}
