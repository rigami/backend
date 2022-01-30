import { Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { WallpapersService } from '@/wallpapers/service';
import { type } from '@/wallpapers/entities/wallpaper';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { User } from '@/auth/users/entities/user';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { RATE } from './entities/rate';

@Controller('v1/wallpapers')
export class WallpapersController {
    private readonly logger = new Logger(WallpapersController.name);

    constructor(private wallpapersService: WallpapersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('search')
    async search(
        @Query('type') typeWallpaper: type[],
        @Query('query') query: string,
        @Query('count') count: number,
        @CurUser() user: User,
    ) {
        return await this.wallpapersService.search(query, count || 10, typeWallpaper, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('random')
    async random(
        @Query('type') typeWallpaper: type[],
        @Query('query') query: string,
        @Query('count') count: number,
        @CurUser() user: User,
    ) {
        return await this.wallpapersService.random(query, +count || 10, typeWallpaper, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('collection/:collectionName')
    async collection(
        @Param('collectionName') collectionName: string,
        @Query('type') typeWallpaper: type[],
        @Query('count') count: number,
        @CurUser() user: User,
    ) {
        return await this.wallpapersService.collection(collectionName, +count || 10, typeWallpaper, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/like')
    async like(@Param('id') id: string, @CurUser() user: User) {
        await this.wallpapersService.setRate(id, RATE.like, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/dislike')
    async dislike(@Param('id') id: string, @CurUser() user: User) {
        await this.wallpapersService.setRate(id, RATE.dislike, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/reset-rate')
    async resetRate(@Param('id') id: string, @CurUser() user: User) {
        await this.wallpapersService.resetRate(id, user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post(':id/mark-download')
    async markDownload(@Param('id') id: string, @CurUser() user: User) {
        await this.wallpapersService.markDownload(id, user);
    }
}
