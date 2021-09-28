import { Module } from '@nestjs/common';
import { SyncService } from './service';
import { SyncController } from './controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { Commit } from '@/sync/schemas/commit';

@Module({
    imports: [TypegooseModule.forFeature([Commit])],
    providers: [SyncService],
    controllers: [SyncController],
    exports: [SyncService],
})
export class SyncModule {}
