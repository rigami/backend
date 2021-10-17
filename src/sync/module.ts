import { Module } from '@nestjs/common';
import { SyncController } from './controller';
import { VCSModule } from '@/utils/vcs/module';
import { FoldersSyncModule } from '@/sync/modules/folders/module';
import { BookmarksSyncModule } from '@/sync/modules/bookmarks/module';
import { SyncService } from '@/sync/service';
import { TagsSyncModule } from '@/sync/modules/tags/module';

@Module({
    imports: [VCSModule.register('sync'), BookmarksSyncModule, FoldersSyncModule, TagsSyncModule],
    controllers: [SyncController],
    providers: [SyncService],
    exports: [SyncService],
})
export class SyncModule {}
