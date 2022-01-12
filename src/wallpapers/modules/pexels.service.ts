import { Injectable, Logger } from '@nestjs/common';
import { IWallpapersService } from '@/wallpapers/modules/service.interface';
import { service, type, Wallpaper } from '@/wallpapers/entities/wallpaper';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { encodeInternalId, LiteWallpaper } from '@/wallpapers/service';
import { plainToClass } from 'class-transformer';

@Injectable()
export class PexelsService implements IWallpapersService {
    private readonly logger = new Logger(PexelsService.name);

    constructor(private httpService: HttpService, private configService: ConfigService) {}

    private async getData(query: string): Promise<any> {
        const apiKey = this.configService.get<string>('wallpapers.pexels.apiKey');

        const { data } = await firstValueFrom(
            this.httpService.get(
                `https://api.pexels.com${query}
                    &orientation=landscape
                    &size=medium
                    &min_width=1280
                    &min_height=720
                    &max_duration=60`.replace(/(\r\n|\n|\s|\r)/gm, ''),
                {
                    responseType: 'json',
                    headers: {
                        Authorization: apiKey,
                    },
                    maxRedirects: 5,
                },
            ),
        );

        return data;
    }

    private static rawToEntity(raw): Wallpaper {
        let max = 0;

        raw.video_files.forEach((item, index) => {
            const nodeA = raw.video_files[max];
            const nodeB = raw.video_files[index];

            if (nodeA.width < nodeB.width && nodeB.width <= 1920) {
                max = index;
            }
        });

        const rawLink = raw.video_files[max].link;
        const fullLink = raw.video_files[max].link;

        return plainToClass(Wallpaper, {
            id: encodeInternalId({
                idInService: raw.id,
                service: service.pexels,
                type: type.video,
            }),
            idInService: raw.id,
            rawSrc: rawLink,
            fullSrc: fullLink,
            previewSrc: raw.image,
            sourceLink: raw.url,
            author: raw.user.url.substring(raw.user.url.indexOf('@')),
            authorName: raw.user.name,
            authorAvatarSrc: '',
            description: '',
            color: raw.avg_color || '',
            service: service.pexels,
            type: type.video,
        });
    }

    getRandom(query: string, count: number): Promise<Wallpaper[]> {
        return Promise.resolve([]);
    }

    getRandomByCollection(collection: string, count: number): Promise<Wallpaper[]> {
        return Promise.resolve([]);
    }

    async search(query: string, count: number): Promise<Wallpaper[]> {
        const response = await this.getData(
            query != '' ? `/videos/search?query=${query}&per_page=${count}` : `/videos/popular?per_page=${count}`,
        );

        return response.videos.map(PexelsService.rawToEntity);
    }

    markDownload(wallpaper: LiteWallpaper) {}
}
