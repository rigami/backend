import { Module } from '@nestjs/common';
import { DevicesService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { DeviceSchema } from './schemas/device';
import { DevicesController } from './controller';

@Module({
    imports: [TypegooseModule.forFeature([DeviceSchema], 'main')],
    providers: [DevicesService],
    controllers: [DevicesController],
    exports: [DevicesService],
})
export class DevicesModule {}
