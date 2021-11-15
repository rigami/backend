import { Module } from '@nestjs/common';
import { BookmarksSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { BookmarkSnapshotSchema } from './schemas/bookmark.snapshot';
import { HistorySchema } from '@/sync/schemas/history';

@Module({
    imports: [TypegooseModule.forFeature([BookmarkSnapshotSchema, HistorySchema], 'sync')],
    providers: [BookmarksSyncService],
    exports: [BookmarksSyncService],
})
export class BookmarksSyncModule {}
