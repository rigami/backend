import { Module } from '@nestjs/common';
import { SyncController } from './controller';
import { VCSModule } from '@/utils/vcs/module';
import { FoldersSyncModule } from '@/sync/modules/folders/module';
import { BookmarksSyncModule } from '@/sync/modules/bookmarks/module';
import { SyncService } from '@/sync/service';
import { TagsSyncModule } from '@/sync/modules/tags/module';
import { TypegooseModule } from 'nestjs-typegoose';
import { HistorySchema } from '@/sync/schemas/history';
import { DevicesModule } from '@/auth/devices/module';
import { FavoritesSyncModule } from '@/sync/modules/favorites/module';
import { SettingsSyncModule } from '@/sync/modules/setting/module';

@Module({
    imports: [
        DevicesModule,
        VCSModule.register('sync'),
        TypegooseModule.forFeature([HistorySchema], 'sync'),
        BookmarksSyncModule,
        FoldersSyncModule,
        TagsSyncModule,
        FavoritesSyncModule,
        SettingsSyncModule,
    ],
    controllers: [SyncController],
    providers: [SyncService],
    exports: [SyncService],
})
export class SyncModule {}
