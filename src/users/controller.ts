import { BadRequestException, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/utils/currentUser.param.decorator';
import { UsersService } from '@/users/service';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Post('merge/activate')
    async merge(@CurrentUser() user, @Query() query) {
        try {
            return await this.usersService.mergeUsers(user, query.code);
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Post('merge/get-code')
    async generateMergeCode(@CurrentUser() user) {
        return this.usersService.createMergeRequest(user);
    }
}
