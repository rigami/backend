import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/utils/currentUser.param.decorator';
import { UsersService } from '@/users/service';
import { MergeUsersService } from '@/users/merge.service';

@Controller('v1/users')
export class UsersController {
    constructor(private usersService: UsersService, private mergeService: MergeUsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('merge/apply-request')
    async merge(@CurrentUser() user, @Query() query) {
        try {
            const mergeInfo = await this.mergeService.mergeUsers(user, query.code);

            return {
                newUsername: mergeInfo.master.email,
                newPassword: mergeInfo.master.password,
            };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('merge/create-request')
    async generateMergeCode(@CurrentUser() user) {
        return this.mergeService.createMergeRequest(user);
    }
}
