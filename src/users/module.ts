import { Module } from '@nestjs/common';
import { UsersService } from './service';
import { UsersController } from '@/users/controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { UserSchema } from './schemas/user';
import { UserMergeRequestSchema } from './schemas/userMergeRequest';
import { MergeUsersService } from '@/users/merge.service';
import { DevicesModule } from '@/devices/module';
import { SSEModule } from '@/sse/module';

@Module({
    imports: [
        TypegooseModule.forFeature([UserSchema, UserMergeRequestSchema], 'main'),
        DevicesModule,
        SSEModule.register(),
    ],
    providers: [UsersService, MergeUsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
