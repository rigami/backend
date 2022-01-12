import { Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { WallpapersService } from '@/wallpapers/service';
import { type } from '@/wallpapers/entities/wallpaper';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { User } from '@/auth/users/entities/user';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { rate } from './entities/rate';

@Controller('v1/wallpapers')
export class WallpapersController {
    private readonly logger = new Logger(WallpapersController.name);

    constructor(private wallpapersService: WallpapersService) {}

    // @UseGuards(JwtAccessAuthGuard)
    @Get('search')
    async search(
        @Query('type') typeWallpaper: type = type.image,
        @Query('query') query: string,
        // @CurUser() user: User,
    ) {
        console.log('typeWallpaper:', typeWallpaper);
        return await this.wallpapersService.search(query, 12, typeWallpaper);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/like')
    async like(@Param('id') internalId: string, @CurUser() user: User) {
        await this.wallpapersService.setRate(internalId, rate.like, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/dislike')
    async dislike(@Param('id') internalId: string, @CurUser() user: User) {
        await this.wallpapersService.setRate(internalId, rate.dislike, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/reset-rate')
    async resetRate(@Param('id') internalId: string, @CurUser() user: User) {
        await this.wallpapersService.resetRate(internalId, user);
    }
}
