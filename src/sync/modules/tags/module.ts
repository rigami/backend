import { Module } from '@nestjs/common';
import { TagsSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { TagSchema } from './schemas/tag';

@Module({
    imports: [TypegooseModule.forFeature([TagSchema], 'main')],
    providers: [TagsSyncService],
    exports: [TagsSyncService],
})
export class TagsSyncModule {}
