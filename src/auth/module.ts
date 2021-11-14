import { Module } from '@nestjs/common';
import { UsersModule } from '@/auth/users/module';
import { DevicesModule } from '@/auth/devices/module';
import { AuthModule } from '@/auth/auth/module';

@Module({
    imports: [AuthModule, UsersModule, DevicesModule],
})
export class AuthCommonModule {}
