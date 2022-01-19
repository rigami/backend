import { Module } from '@nestjs/common';
import { UsersService } from './service';
import { UsersController } from '@/auth/users/controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { UserSchema } from './schemas/user';
import { UserMergeRequestSchema } from './schemas/userMergeRequest';
import { MergeUsersService } from '@/auth/users/merge.service';
import { DevicesModule } from '@/auth/devices/module';
import { SSEModule } from '@/utils/sse/module';
import { AuthModule } from '@/auth/auth/module';

@Module({
    imports: [
        TypegooseModule.forFeature([UserSchema, UserMergeRequestSchema], 'main'),
        AuthModule,
        DevicesModule,
        SSEModule.register(),
    ],
    providers: [UsersService, MergeUsersService],
    controllers: [UsersController],
    exports: [UsersService, MergeUsersService],
})
export class UsersModule {}
