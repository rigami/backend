import { Module } from '@nestjs/common';
import { BookmarksService } from './service';
import { BookmarksController } from './controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { StateHashSchema } from '@/bookmarks/schemas/stateHash';

@Module({
    imports: [TypegooseModule.forFeature([BookmarkSchema, StateHashSchema])],
    providers: [BookmarksService],
    controllers: [BookmarksController],
    exports: [BookmarksService],
})
export class BookmarksModule {}
