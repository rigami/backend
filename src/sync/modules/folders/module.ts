import { Module } from '@nestjs/common';
import { FoldersSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { FolderSnapshotSchema } from './schemas/folder.snapshot';
import { HistorySchema } from '@/sync/schemas/history';

@Module({
    imports: [TypegooseModule.forFeature([FolderSnapshotSchema, HistorySchema], 'sync')],
    providers: [FoldersSyncService],
    exports: [FoldersSyncService],
})
export class FoldersSyncModule {}
