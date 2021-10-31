import { Module } from '@nestjs/common';
import { FoldersSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { FolderSchema } from './schemas/folder';

@Module({
    imports: [TypegooseModule.forFeature([FolderSchema], 'main')],
    providers: [FoldersSyncService],
    exports: [FoldersSyncService],
})
export class FoldersSyncModule {}
