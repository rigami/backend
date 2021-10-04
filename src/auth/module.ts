import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { LocalStrategy } from './strategies/local/strategy';
import { UsersModule } from '@/users/module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { AuthController } from './controller';
import { JwtRefreshStrategy } from './strategies/jwt/refresh.strategy';
import { DevicesModule } from '@/devices/module';
import { JwtAccessStrategy } from '@/auth/strategies/jwt/access.strategy';

@Module({
    imports: [
        UsersModule,
        DevicesModule,
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
        }),
    ],
    providers: [AuthService, JwtRefreshStrategy, JwtAccessStrategy, LocalStrategy],
    exports: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
