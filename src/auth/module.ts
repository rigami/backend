import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { LocalStrategy } from './strategies/local/strategy';
import { UsersModule } from '@/users/module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { AuthController } from './controller';
import { JwtUserStrategy } from './strategies/jwt/user.strategy';
import { DevicesModule } from '@/devices/module';
import { JwtDeviceStrategy } from '@/auth/strategies/jwt/api.strategy';
import { JwtDeviceRenewalStrategy } from '@/auth/strategies/jwt/device.strategy';

@Module({
    imports: [
        UsersModule,
        DevicesModule,
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
        }),
    ],
    providers: [AuthService, JwtDeviceStrategy, JwtDeviceRenewalStrategy, JwtUserStrategy, LocalStrategy],
    exports: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
