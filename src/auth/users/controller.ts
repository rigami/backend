import { BadRequestException, Controller, Delete, Get, Headers, Ip, Query, Sse, UseGuards } from '@nestjs/common';
import { JwtAccessAuthGuard } from '@/auth/auth/strategies/jwt/auth.guard';
import { CurrentUser } from '@/auth/auth/utils/currentUser.param.decorator';
import { UsersService } from '@/auth/users/service';
import { MergeUsersService } from '@/auth/users/merge.service';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@/utils/sse/entities/messageEvent';
import { v4 as UUIDv4 } from 'uuid';
import { User } from '@/auth/users/entities/user';
import { RequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { Device } from '@/auth/devices/entities/device';
import { CurrentDevice } from '@/auth/auth/utils/currentDevice.param.decorator';

@Controller('v1/users')
export class UsersController {
    constructor(private usersService: UsersService, private mergeService: MergeUsersService) {}

    /* @UseGuards(JwtAccessAuthGuard)
    @Sse('merge/request/create')
    async generateMergeCodeByExistUser(
        @CurrentUser() user,
        @CurrentDevice() device,
    ): Promise<Observable<MessageEvent>> {
        console.log('user:', user);

        return await this.mergeService.createAndWatchMergeRequest(user, device);
    }

    @Sse('merge/request/no-user/create')
    async generateMergeCodeByNotExistUser(@RequestHeaders() headers: Headers, @Ip() ip: string): Promise<Observable<MessageEvent>> {
        const tempUser: User = {
            createDate: undefined,
            password: '',
            username: '',
            id: UUIDv4(),
            isVirtual: true,
            isTemp: true,
        };

        const tempDevice: Device = {
            lastActivityIp: ip,
            holderUserId: tempUser.id,
            id: headers['device-token'],
            token: headers['device-token'],
            type: headers['device-type'],
            userAgent: headers['user-agent'],
            isTemp: true,
        };

        return await this.mergeService.createAndWatchMergeRequest(tempUser, tempDevice);
    }

    @UseGuards(JwtAccessAuthGuard)
    @Delete('merge/request')
    async deleteMergeCodeOfExistUser(@CurrentUser() user) {
        return this.mergeService.deleteMergeRequest(user);
    }

    @Delete('merge/request/no-user')
    async deleteMergeCodeOfNotExistUser(@Query('requestId') requestId: string) {
        const tempUser: User = {
            createDate: undefined,
            password: '',
            username: '',
            id: requestId,
            isTemp: true,
            isVirtual: true,
        };

        return this.mergeService.deleteMergeRequest(tempUser);
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

    @Get('merge/request/no-user/apply')
    async applyMergeByNotExistUser(@RequestHeaders() headers: Headers, @Ip() ip: string, @Query() query) {
        const tempUser: User = {
            createDate: undefined,
            password: '',
            username: '',
            id: UUIDv4(),
            isVirtual: true,
            isTemp: true,
        };

        const tempDevice: Device = {
            lastActivityIp: ip,
            holderUserId: tempUser.id,
            id: headers['device-token'],
            token: headers['device-token'],
            type: headers['device-type'],
            userAgent: headers['user-agent'],
            isTemp: true,
        };

        try {
            return await this.mergeService.mergeUsers(query.code, tempUser, tempDevice);
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    } */
}
