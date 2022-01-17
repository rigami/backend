import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    Logger,
    Param,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { User } from '@/auth/users/entities/user';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { InjectModel } from 'nestjs-typegoose';
import { CollectionWallpaperSchema } from '@/wallpapers/schemas/collection';
import { ReturnModelType } from '@typegoose/typegoose';
import { CollectionWallpaper } from '@/wallpapers/entities/collection';
import { encodeInternalId, WallpapersService } from '@/wallpapers/service';
import { omit } from 'lodash';
import { service } from '@/wallpapers/entities/wallpaper';

@Controller('v1/wallpapers/collections')
export class CollectionsWallpapersController {
    private readonly logger = new Logger(CollectionsWallpapersController.name);

    constructor(
        private wallpapersService: WallpapersService,
        @InjectModel(CollectionWallpaperSchema)
        private readonly collectionWallpaperModel: ReturnModelType<typeof CollectionWallpaperSchema>,
    ) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get()
    async search(
        @Query() query,
        @RequestHeaders() headers: Headers,
        @CurUser() user: User,
        @Res({ passthrough: true }) response,
    ) {
        const filter = JSON.parse(query.filter);
        const range = JSON.parse(query.range);
        const sort = JSON.parse(query.sort);

        const mongoQuery = {
            ...omit(filter, ['idInService']),
            idInService: new RegExp(filter.idInService || '', 'i'),
        };

        const res = await this.collectionWallpaperModel
            .find(mongoQuery)
            .skip(range[0])
            .limit(range[1] - range[0] + 1);

        const total = await this.collectionWallpaperModel.find(mongoQuery).count();

        response.set({
            'Content-Range': `wallpapers/collections ${range[0]}-${range[0] + res.length - 1}/${total}`,
            'Access-Control-Expose-Headers': 'Content-Range',
        });

        return res;
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post()
    @HttpCode(200)
    async createItem(@Body() collection: Pick<CollectionWallpaper, 'service' | 'idInService' | 'collectionType'>, @CurUser() user: User) {
        console.log(collection, user);

        const wallpaper = await this.wallpapersService.getWallpaper(collection.service, collection.idInService);

        console.log('wallpaper:', wallpaper)

        return this.collectionWallpaperModel.create({
            id: encodeInternalId({
                idInService: collection.idInService,
                service: collection.service,
                type: wallpaper.type,
            }),
            ...collection,
            ...wallpaper,
        });
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('/:id')
    @HttpCode(200)
    async deleteOne(@Param('id') id: string) {
        return this.collectionWallpaperModel.findOneAndDelete({
            id,
        });
    }
}
