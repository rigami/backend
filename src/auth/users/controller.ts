import { BadRequestException, Controller, Delete, Get, Query, Sse, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { UsersService } from '@/auth/users/service';
import { MergeUsersService } from '@/auth/users/merge.service';
import { Observable } from 'rxjs';
import { MessageEvent } from '@/utils/sse/entities/messageEvent';

@Controller('v1/users')
export class UsersController {
    constructor(private usersService: UsersService, private mergeService: MergeUsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('merge/apply-request')
    async merge(@CurrentUser() user, @Query() query) {
        try {
            await this.mergeService.mergeUsers(user, query.code);

            return {};
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Sse('merge/create-request')
    generateMergeCode(@CurrentUser() user): Observable<MessageEvent> {
        console.log('user:', user);

        return this.mergeService.crateAndWatchMergeRequest(user);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('merge/delete-request')
    async deleteMergeCode(@CurrentUser() user) {
        return this.mergeService.deleteMergeRequest(user);
    }
}
