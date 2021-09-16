import { Module } from '@nestjs/common';
import { UsersModule } from '../users/module';
import { AuthModule } from '../auth/module';

@Module({
    imports: [AuthModule, UsersModule],
})
export class AppModule {}
