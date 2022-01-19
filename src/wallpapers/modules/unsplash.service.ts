import { Injectable, Logger } from '@nestjs/common';
import { IWallpapersService } from '@/wallpapers/modules/service.interface';
import { service, type, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { encodeInternalId, LiteWallpaper } from '@/wallpapers/service';
import { plainToClass } from 'class-transformer';

@Injectable()
export class UnsplashService implements IWallpapersService {
    private readonly logger = new Logger(UnsplashService.name);

    constructor(private httpService: HttpService, private configService: ConfigService) {}

    private async getData(query: string): Promise<any> {
        const apiKey = this.configService.get<string>('wallpapers.unsplash.apiKey');

        const { data } = await firstValueFrom(
            this.httpService.get(`https://api.unsplash.com${query}`, {
                responseType: 'json',
                headers: {
                    Authorization: `Client-ID ${apiKey}`,
                },
                maxRedirects: 5,
            }),
        );

        return data;
    }

    private static rawToEntity(raw): Wallpaper {
        return plainToClass(Wallpaper, {
            id: encodeInternalId({
                idInService: raw.id,
                service: service.unsplash,
            }),
            idInService: raw.id,
            rawSrc: raw.urls.raw,
            fullSrc: raw.urls.full,
            previewSrc: raw.urls.small,
            sourceLink: raw.links.html,
            author: raw.user.username,
            authorName: raw.user.name,
            authorAvatarSrc: raw.user.profile_image.medium,
            description: raw.description,
            color: raw.color,
            service: service.unsplash,
            type: type.image,
        });
    }

    async getRandom(query: string, count: number): Promise<Wallpaper[]> {
        const response = await this.getData(`/photos/random?orientation=landscape&query=${query}&count=${count}`);

        return response.results.map(UnsplashService.rawToEntity);
    }

    async getById(id: string): Promise<Wallpaper> {
        const response = await this.getData(`/photos/${id}`);

        return UnsplashService.rawToEntity(response);
    }

    getRandomByCollection(collection: string, count: number): Promise<Wallpaper[]> {
        return Promise.resolve([]);
    }

    async search(query: string, count: number): Promise<Wallpaper[]> {
        const response = await this.getData(`/search/photos?orientation=landscape&query=${query}&per_page=${count}`);

        return response.results.map(UnsplashService.rawToEntity);
    }

    async markDownload(wallpaper: LiteWallpaper): Promise<void> {
        await this.getData(`/photos/${wallpaper.idInService}/download`);
    }
}
