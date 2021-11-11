import { Module } from '@nestjs/common';
import { BookmarksSyncService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';

@Module({
    imports: [TypegooseModule.forFeature([BookmarkSchema], 'sync')],
    providers: [BookmarksSyncService],
    exports: [BookmarksSyncService],
})
export class BookmarksSyncModule {}
