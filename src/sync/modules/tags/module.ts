import { Module } from '@nestjs/common';
import { TagsSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { TagSnapshotSchema } from './schemas/tag.snapshot';
import { HistorySchema } from '@/sync/schemas/history';

@Module({
    imports: [TypegooseModule.forFeature([TagSnapshotSchema, HistorySchema], 'sync')],
    providers: [TagsSyncService],
    exports: [TagsSyncService],
})
export class TagsSyncModule {}
