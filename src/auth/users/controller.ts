import { BadRequestException, Controller, Delete, Get, Headers, Ip, Query, Sse, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { UsersService } from '@/auth/users/service';
import { MergeUsersService } from '@/auth/users/merge.service';
import { Observable } from 'rxjs';
import { MessageEvent } from '@/utils/sse/entities/messageEvent';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/auth/users/entities/user';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { Device } from '@/auth/devices/entities/device';
import { CurrentDevice } from '@/auth/auth/utils/currentDevice.param.decorator';

@Controller('v1/users')
export class UsersController {
    constructor(private usersService: UsersService, private mergeService: MergeUsersService) {}

    @UseGuards(JwtAccessAuthGuard)
    @Get('merge/request/with-exist-user/apply')
    async mergeWithExistUser(@CurrentUser() user, @Query() query) {
        try {
            await this.mergeService.mergeUsers(user, query.code);

            return {};
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @UseGuards(JwtAccessAuthGuard)
    @Sse('merge/request/exist-user/create')
    generateMergeCodeByExistUser(@CurrentUser() user, @CurrentDevice() device): Observable<MessageEvent> {
        console.log('user:', user);

        return this.mergeService.createAndWatchMergeRequest(user, device);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('merge/request/exist-user')
    async deleteMergeCodeFromExistUser(@CurrentUser() user) {
        return this.mergeService.deleteMergeRequest(user);
    }

    @Get('merge/request/create-virtual-user/apply')
    async createUserAndMerge(@RequestHeaders() headers: Headers, @Ip() ip: string, @Query() query) {
        try {
            return await this.mergeService.createAndMergeUsers(
                {
                    ip,
                    userAgent: headers['user-agent'],
                    deviceType: headers['device-type'],
                    deviceToken: headers['device-token'],
                },
                query.code,
            );
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    @Sse('merge/request/with-exist-user/create')
    generateTempMergeCode(@RequestHeaders() headers: Headers): Observable<MessageEvent> {
        const tempUser: User = {
            createDate: undefined,
            password: '',
            username: '',
            id: UUIDv4(),
            isTemp: true,
            isVirtual: true,
        };

        const tempDevice: Device = {
            holderUserId: tempUser.id,
            id: headers['device-token'],
            token: headers['device-token'],
            type: headers['device-type'],
            userAgent: headers['user-agent'],
        };

        return this.mergeService.createAndWatchMergeRequest(tempUser, tempDevice);
    }

    @Delete('merge/request/with-exist-user')
    async deleteTempMergeCode(@Query() query) {
        const tempUser: User = {
            createDate: undefined,
            password: '',
            username: '',
            id: query.requestId,
            isTemp: true,
            isVirtual: true,
        };

        return this.mergeService.deleteMergeRequest(tempUser);
    }
}
