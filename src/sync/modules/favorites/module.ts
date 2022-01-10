import { Module } from '@nestjs/common';
import { FavoritesSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { FavoriteSnapshotSchema } from './schemas/favorite.snapshot';
import { HistorySchema } from '@/sync/schemas/history';

@Module({
    imports: [TypegooseModule.forFeature([FavoriteSnapshotSchema, HistorySchema], 'sync')],
    providers: [FavoritesSyncService],
    exports: [FavoritesSyncService],
})
export class FavoritesSyncModule {}
