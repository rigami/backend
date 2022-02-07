import { forwardRef, Module } from '@nestjs/common';
import { DevicesService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { DevicesController } from './controller';
import { UsersModule } from '@/auth/users/module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '@/auth/auth/constants';

@Module({
    imports: [
        TypegooseModule.forFeature([DeviceSchema], 'main'),
        forwardRef(() => UsersModule),
        JwtModule.register({
            secret: jwtConstants.secret,
        }),
    ],
    providers: [DevicesService],
    controllers: [DevicesController],
    exports: [DevicesService],
})
export class DevicesModule {}
