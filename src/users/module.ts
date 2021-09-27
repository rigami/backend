import { Module } from '@nestjs/common';
import { UsersService } from './service';
import { UsersController } from '@/users/controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { User } from './schemas/user';

@Module({
    imports: [TypegooseModule.forFeature([User])],
    providers: [UsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
