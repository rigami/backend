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
    Type,
    UseGuards,
} from '@nestjs/common';
import { encodeInternalId, WallpapersService } from '@/wallpapers/service';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { BlockedWallpaperSchema } from '@/wallpapers/schemas/blocked';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { ROLE, User } from '@/auth/users/entities/user';
import { BLOCKED_METHOD, BlockedWallpaper } from '@/wallpapers/entities/blocked';
import { omit } from 'lodash';
import { RolesGuard } from '@/auth/auth/strategies/roles/roles.guard';
import { DevicesGuard } from '@/auth/auth/strategies/devices/device.guard';
import { Roles } from '@/auth/auth/strategies/roles/role.decorator';
import { Devices } from '@/auth/auth/strategies/devices/device.decorator';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';

@UseGuards(JwtAccessAuthGuard, RolesGuard, DevicesGuard)
@Controller('v1/wallpapers/blocked')
export class BlockedWallpapersController {
    private readonly logger = new Logger(BlockedWallpapersController.name);

    constructor(
        private wallpapersService: WallpapersService,
        @InjectModel(BlockedWallpaperSchema)
        private readonly blackListWallpaperModel: ReturnModelType<typeof BlockedWallpaperSchema>,
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

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @Post()
    @HttpCode(200)
    async createItem(@Body() entity: Omit<BlockedWallpaper, 'blockedMethod'>) {
        return this.blackListWallpaperModel.create({
            id: encodeInternalId({
                idInService: entity.idInService,
                service: entity.service,
            }),
            ...entity,
            blockedMethod: BLOCKED_METHOD.manual,
        });
    }

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @Delete('/:id')
    @HttpCode(200)
    async deleteOne(@Param('id') id: string) {
        return this.blackListWallpaperModel.findOneAndDelete({
            id,
        });
    }
}
