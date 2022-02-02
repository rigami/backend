import { BadRequestException, Controller, Delete, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { UsersService } from '@/auth/users/service';
import { MergeUsersService } from '@/auth/users/merge.service';
import { Observable } from 'rxjs';
import { MessageEvent } from '@/utils/sse/entities/messageEvent';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { CurrentDevice } from '@/auth/auth/utils/currentDevice.param.decorator';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';

@Controller('v1/users')
export class UsersController {
    constructor(private usersService: UsersService, private mergeService: MergeUsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Sse('merge/request/create')
    async generateMergeCodeByExistUser(
        @CurrentUser() user,
        @CurrentDevice() device,
    ): Promise<Observable<MessageEvent>> {
        console.log('user:', user);

        return await this.mergeService.createAndWatchMergeRequest(user, device);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('merge/request')
    async deleteMergeCodeOfExistUser(@CurrentUser() user) {
        return this.mergeService.deleteMergeRequest(user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Get('merge/request/apply')
    async applyMergeByExistUser(@CurrentUser() user, @CurrentDevice() device, @Query() query) {
        try {
            return await this.mergeService.mergeUsers(query.code, user, device);
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }
}
