import { Module } from '@nestjs/common';
import { BookmarksService } from './service';
import { BookmarksController } from './controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { VCSModule } from '@/vcs/module';
import { DeletedBookmarkSchema } from '@/bookmarks/schemas/deletedBookmark';

@Module({
    imports: [
        TypegooseModule.forFeature([BookmarkSchema, DeletedBookmarkSchema], 'main'),
        VCSModule.register('bookmarks'),
    ],
    providers: [BookmarksService],
    controllers: [BookmarksController],
    exports: [BookmarksService],
})
export class BookmarksModule {}
