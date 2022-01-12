import { Module } from '@nestjs/common';
import { WallpapersController } from './controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { UnsplashService } from '@/wallpapers/modules/unsplash.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { WallpaperCacheSchema } from '@/wallpapers/schemas/wallpaperCache';
import { RateWallpaperSchema } from '@/wallpapers/schemas/rate';
import { WallpapersService } from '@/wallpapers/service';
import { BlacklistWallpaperSchema } from '@/wallpapers/schemas/blacklist';
import { CollectionWallpaperSchema } from '@/wallpapers/schemas/collection';
import { BlackListWallpapersController } from '@/wallpapers/blackList.controller';
import { CollectionsWallpapersController } from '@/wallpapers/collections.controller';
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
            [RateWallpaperSchema, BlacklistWallpaperSchema, CollectionWallpaperSchema],
            'wallpapers',
        ),
    ],
    providers: [UnsplashService, PixabayService, PexelsService, WallpapersService],
    controllers: [WallpapersController, BlackListWallpapersController, CollectionsWallpapersController],
})
export class WallpapersModule {}
