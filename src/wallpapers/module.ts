import { Module } from '@nestjs/common';
import { WallpapersController } from './controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UnsplashService } from '@/wallpapers/modules/unsplash.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';
import { RateWallpaperSchema } from '@/wallpapers/schemas/rate';
import { WallpapersService } from '@/wallpapers/service';
import { BlockedWallpaperSchema } from '@/wallpapers/schemas/blocked';
import { CollectionWallpaperSchema } from '@/wallpapers/schemas/collection';
import { BlockedWallpapersController } from '@/wallpapers/blocked.console.controller';
import { CollectionsWallpapersController } from '@/wallpapers/collections.console.controller';
import { PixabayService } from '@/wallpapers/modules/pixabay.service';
import { PexelsService } from '@/wallpapers/modules/pexels.service';

@Module({
    imports: [
        ConfigModule,
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
        TypegooseModule.forFeature([WallpaperCacheSchema], 'cache'),
        TypegooseModule.forFeature(
            [RateWallpaperSchema, BlockedWallpaperSchema, CollectionWallpaperSchema],
            'wallpapers',
        ),
    ],
    providers: [UnsplashService, PixabayService, PexelsService, WallpapersService],
    controllers: [WallpapersController, BlockedWallpapersController, CollectionsWallpapersController],
})
export class WallpapersModule {}
