import { Injectable, Logger } from '@nestjs/common';
import { IWallpapersService } from '@/wallpapers/modules/service.interface';
import { WALLPAPER_SOURCE, type, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { encodeInternalId, LiteWallpaper } from '@/wallpapers/service';
import { plainToClass } from 'class-transformer';

@Injectable()
export class PixabayService implements IWallpapersService {
    private readonly logger = new Logger(PixabayService.name);

    constructor(private httpService: HttpService, private configService: ConfigService) {}

    private async getData(query: string): Promise<any> {
        const apiKey = this.configService.get<string>('wallpapers.pixabay.apiKey');

        const { data } = await firstValueFrom(
            this.httpService.get(
                `https://pixabay.com/api${query}
                    &key=${apiKey}
                    &safesearch=true
                    &editors_choice=true
                    &min_height=720
                    &min_width=1280
                    &video_type=film`.replace(/(\r\n|\n|\s|\r)/gm, ''),
                {
                    responseType: 'json',
                    maxRedirects: 5,
                },
            ),
        );

        return data;
    }

    private static rawToEntity(raw): Wallpaper {
        const largeWidth = +raw.videos.large.width;
        const mediumWidth = +raw.videos.medium.width;
        const smallWidth = +raw.videos.small.width;

        let rawLink = '';
        let fullLink = '';

        if (largeWidth != 0 && largeWidth <= 1920) {
            rawLink = raw.videos.large.url;
            fullLink = raw.videos.large.url;
        } else if (mediumWidth != 0 && mediumWidth <= 1920) {
            rawLink = raw.videos.medium.url;
            fullLink = raw.videos.medium.url;
        } else if (smallWidth != 0 && smallWidth <= 1920) {
            rawLink = raw.videos.small.url;
            fullLink = raw.videos.small.url;
        } else {
            rawLink = raw.videos.tiny.url;
            fullLink = raw.videos.tiny.url;
        }

        const pictureId = raw.picture_id;
        const previewLink = `https://i.vimeocdn.com/video/${pictureId}_320x240.jpg`;
        const author = `@${raw.user}`;
        const authorName = raw.user;
        const authorAvatarSrc = raw.userImageURL;

        return plainToClass(Wallpaper, {
            id: encodeInternalId({
                idInSource: raw.id,
                source: WALLPAPER_SOURCE.pixabay,
            }),
            idInSource: raw.id,
            rawSrc: `${rawLink}&download=1`,
            fullSrc: `${fullLink}&download=1`,
            previewSrc: previewLink,
            sourceLink: raw.pageURL,
            author: author,
            authorName: authorName,
            authorAvatarSrc: authorAvatarSrc,
            description: raw.description,
            color: raw.color,
            source: WALLPAPER_SOURCE.pixabay,
            type: type.video,
        });
    }

    async getRandom(query: string, count: number): Promise<Wallpaper[]> {
        const response = await this.getData(`/videos?${query ? `q=${query}&` : ''}per_page=3`);

        if (response.total === 0) return [];

        if (count >= response.total || response.total <= 15) {
            const response = await this.getData(`/videos?${query ? `q=${query}&` : ''}per_page=${Math.min(count, 15)}`);

            return response.hits
                .sort(() => Math.random() - 0.5)
                .slice(0, count)
                .map(PixabayService.rawToEntity);
        }

        const totalPages = Math.ceil(response.total / 15);
        const pages = Array.from({ length: Math.ceil(totalPages * 0.6) }, (el, index) => index + 1).sort(
            () => Math.random() - 0.5,
        );
        let list = [];

        for (const page of pages) {
            const response = await this.getData(`/videos?${query ? `q=${query}&` : ''}per_page=15&page=${page}`);
            const found = response.hits.sort(() => Math.random() - 0.5).slice(0, 5);

            list = list.concat(found);

            list = list.filter(
                (checkItem, checkIndex) => !list.find((item, index) => checkItem.id === item.id && checkIndex < index),
            );

            if (list.length >= count) break;
        }

        return list.slice(0, count).map(PixabayService.rawToEntity);
    }

    getRandomByCollection(collection: string, count: number): Promise<Wallpaper[]> {
        return Promise.resolve([]);
    }

    async getById(id: string): Promise<Wallpaper> {
        const response = await this.getData(`/videos?id=${id}`);

        return PixabayService.rawToEntity(response.hits[0]);
    }

    async search(query: string, count: number): Promise<Wallpaper[]> {
        const response = await this.getData(`/videos?q=${query}&per_page=${Math.max(3, Math.min(200, count))}`);

        return response.hits.slice(0, count).map(PixabayService.rawToEntity);
    }

    markDownload(wallpaper: LiteWallpaper) {}
}
