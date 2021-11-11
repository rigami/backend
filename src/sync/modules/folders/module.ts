import { Module } from '@nestjs/common';
import { FoldersSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { FolderSchema } from './schemas/folder';
import { HistorySchema } from '@/sync/schemas/history';

@Module({
    imports: [TypegooseModule.forFeature([FolderSchema, HistorySchema], 'sync')],
    providers: [FoldersSyncService],
    exports: [FoldersSyncService],
})
export class FoldersSyncModule {}
