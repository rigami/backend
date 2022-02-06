import { forwardRef, Module } from '@nestjs/common';
import { DevicesService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { DevicesController } from './controller';
import { UsersModule } from '@/auth/users/module';

@Module({
    imports: [TypegooseModule.forFeature([DeviceSchema], 'main'), forwardRef(() => UsersModule)],
    providers: [DevicesService],
    controllers: [DevicesController],
    exports: [DevicesService],
})
export class DevicesModule {}
