import { Module } from '@nestjs/common';
import { UsersService } from './service';
import { UsersController } from '@/users/controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { User } from './schemas/user';
import { UserMergeRequest } from './schemas/userMergeRequest';
import { MergeUsersService } from '@/users/merge.service';
import { DevicesModule } from '@/devices/module';

@Module({
    imports: [TypegooseModule.forFeature([User, UserMergeRequest]), DevicesModule],
    providers: [UsersService, MergeUsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
