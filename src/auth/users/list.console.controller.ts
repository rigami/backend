import {
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    Logger,
    Param,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { CurUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { ROLE, User } from '@/auth/users/entities/user';
import { omit } from 'lodash';
import { RolesGuard } from '@/auth/auth/strategies/roles/roles.guard';
import { DevicesGuard } from '@/auth/auth/strategies/devices/device.guard';
import { Roles } from '@/auth/auth/strategies/roles/role.decorator';
import { Devices } from '@/auth/auth/strategies/devices/device.decorator';
import { DEVICE_TYPE } from '@/auth/devices/entities/device';
import { UserSchema } from '@/auth/users/schemas/user';
import { UsersService } from '@/auth/users/service';

@UseGuards(JwtAccessAuthGuard, RolesGuard, DevicesGuard)
@Controller('v1/users')
export class UsersListController {
    private readonly logger = new Logger(UsersListController.name);

    constructor(
        private usersService: UsersService,
        @InjectModel(UserSchema)
        private readonly userModel: ReturnModelType<typeof UserSchema>,
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

        const res = await this.userModel
            .find(mongoQuery)
            .sort({
                [sort[0] || 'createDate']: sort[1] === 'ASC' ? 1 : -1,
            })
            .skip(range[0])
            .limit(range[1] - range[0] + 1);

        const total = await this.userModel.find(mongoQuery).count();

        response.set({
            'Content-Range': `wallpapers/black-list ${range[0] + 1}-${range[0] + res.length}/${total}`,
            'Access-Control-Expose-Headers': 'Content-Range',
        });

        return res;
    }

    @Roles(ROLE.moderator)
    @Devices(DEVICE_TYPE.console)
    @Delete('/:id')
    @HttpCode(200)
    async deleteOne(@Param('id') id: string) {
        const user = await this.usersService.findById(id);

        await this.usersService.deleteById(id);

        return user;
    }
}
