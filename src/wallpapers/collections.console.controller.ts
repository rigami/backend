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
import { ROLE, User } from '@/auth/users/entities/user';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { InjectModel } from 'nestjs-typegoose';
import { CollectionWallpaperSchema } from '@/wallpapers/schemas/collection';
import { ReturnModelType } from '@typegoose/typegoose';
import { CollectionWallpaper } from '@/wallpapers/entities/collection';
import { encodeInternalId, WallpapersService } from '@/wallpapers/service';
import { omit } from 'lodash';
import { Roles } from '@/auth/auth/strategies/roles/role.decorator';
import { RolesGuard } from '@/auth/auth/strategies/roles/roles.guard';
import { DevicesGuard } from '@/auth/auth/strategies/devices/device.guard';
import { Devices } from '@/auth/auth/strategies/devices/device.decorator';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

@UseGuards(JwtAccessAuthGuard, RolesGuard, DevicesGuard)
@Controller('v1/wallpapers/collections')
export class CollectionsWallpapersController {
    private readonly logger = new Logger(CollectionsWallpapersController.name);

    constructor(
        private wallpapersService: WallpapersService,
        @InjectModel(CollectionWallpaperSchema)
        private readonly collectionWallpaperModel: ReturnModelType<typeof CollectionWallpaperSchema>,
    ) {}

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
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
            ...omit(filter, ['idInSource']),
            idInSource: new RegExp(filter.idInSource || '', 'i'),
        };

        const res = await this.collectionWallpaperModel
            .find(mongoQuery)
            .sort({
                [sort[0] || 'createDate']: sort[1] === 'ASC' ? 1 : -1,
            })
            .skip(range[0])
            .limit(range[1] - range[0] + 1);

        const total = await this.collectionWallpaperModel.find(mongoQuery).count();

        response.set({
            'Content-Range': `wallpapers/collections ${range[0] + 1}-${range[0] + res.length}/${total}`,
            'Access-Control-Expose-Headers': 'Content-Range',
        });

        return res;
    }

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @Post()
    @HttpCode(200)
    async createItem(
        @Body() collection: Pick<CollectionWallpaper, 'source' | 'idInSource' | 'collectionType'>,
        @CurUser() user: User,
    ) {
        console.log(collection, user);

        const wallpaper = await this.wallpapersService.getWallpaper(collection.source, collection.idInSource);

        console.log('wallpaper:', wallpaper);

        return this.collectionWallpaperModel.create({
            id: encodeInternalId({
                idInSource: collection.idInSource,
                source: collection.source,
            }),
            ...collection,
            ...wallpaper,
        });
    }

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @Delete('/:id')
    @HttpCode(200)
    async deleteOne(@Param('id') id: string) {
        return this.collectionWallpaperModel.findOneAndDelete({
            id,
        });
    }
}
