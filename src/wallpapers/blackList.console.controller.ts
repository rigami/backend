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
import { encodeInternalId, WallpapersService } from '@/wallpapers/service';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { BlacklistWallpaperSchema } from '@/wallpapers/schemas/blacklist';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { User } from '@/auth/users/entities/user';
import { BlackListWallpaper } from '@/wallpapers/entities/blackList';
import { omit } from 'lodash';

@Controller('v1/wallpapers/black-list')
export class BlackListWallpapersController {
    private readonly logger = new Logger(BlackListWallpapersController.name);

    constructor(
        private wallpapersService: WallpapersService,
        @InjectModel(BlacklistWallpaperSchema)
        private readonly blackListWallpaperModel: ReturnModelType<typeof BlacklistWallpaperSchema>,
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

        const res = await this.blackListWallpaperModel
            .find(mongoQuery)
            .sort({
                [sort[0] || 'createDate']: sort[1] === 'ASC' ? 1 : -1,
            })
            .skip(range[0])
            .limit(range[1] - range[0] + 1);

        const total = await this.blackListWallpaperModel.find(mongoQuery).count();

        response.set({
            'Content-Range': `wallpapers/black-list ${range[0] + 1}-${range[0] + res.length}/${total}`,
            'Access-Control-Expose-Headers': 'Content-Range',
        });

        return res;
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post()
    @HttpCode(200)
    async createItem(@Body() entity: BlackListWallpaper) {
        return this.blackListWallpaperModel.create({
            id: encodeInternalId({
                idInService: entity.idInService,
                service: entity.service,
            }),
            ...entity,
        });
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('/:id')
    @HttpCode(200)
    async deleteOne(@Param('id') id: string) {
        return this.blackListWallpaperModel.findOneAndDelete({
            id,
        });
    }
}
