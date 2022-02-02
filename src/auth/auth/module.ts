import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './service';
import { LocalStrategy } from './strategies/local/strategy';
import { UsersModule } from '@/auth/users/module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { AuthController } from './controller';
import { JwtRefreshStrategy } from './strategies/jwt/refresh.strategy';
import { DevicesModule } from '@/auth/devices/module';
import { JwtAccessStrategy } from '@/auth/auth/strategies/jwt/access.strategy';
import { JwtLoginStrategy } from '@/auth/auth/strategies/jwt/login.strategy';

@Module({
    imports: [
        DevicesModule,
        forwardRef(() => UsersModule),
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
        }),
    ],
    providers: [AuthService, JwtRefreshStrategy, JwtAccessStrategy, JwtLoginStrategy, LocalStrategy],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
