import { Module } from '@nestjs/common';
import { UsersService } from './service';
import { UsersController } from '@/users/controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { User } from './schemas/user';
import { UserMergeRequest } from './schemas/userMergeRequest';

@Module({
    imports: [TypegooseModule.forFeature([User, UserMergeRequest])],
    providers: [UsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
