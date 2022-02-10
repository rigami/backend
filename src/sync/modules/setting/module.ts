import { Module } from '@nestjs/common';
import { SettingsSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { HistorySchema } from '@/sync/schemas/history';
import { SettingSnapshotSchema } from './schemas/setting.snapshot';

@Module({
    imports: [TypegooseModule.forFeature([SettingSnapshotSchema, HistorySchema], 'sync')],
    providers: [SettingsSyncService],
    exports: [SettingsSyncService],
})
export class SettingsSyncModule {}
