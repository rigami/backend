import { Module } from '@nestjs/common';
import { AuthService } from './service';
import { LocalStrategy } from './strategies/local/strategy';
import { UsersModule } from '@/users/module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { AuthController } from './controller';
import { JwtStrategy } from './strategies/jwt/strategy';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
        }),
    ],
    providers: [AuthService, JwtStrategy, LocalStrategy],
    exports: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
