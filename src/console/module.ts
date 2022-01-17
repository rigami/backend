import { Module } from '@nestjs/common';
import { ConsoleController } from './controller';
import { UsersModule } from '@/auth/users/module';

@Module({
    imports: [UsersModule],
    controllers: [ConsoleController],
})
export class ConsoleModule {}
