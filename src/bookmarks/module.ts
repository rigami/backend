import { Module } from '@nestjs/common';
import { BookmarksService } from './service';
import { BookmarksController } from './controller';
import { TypegooseModule } from 'nestjs-typegoose';
import { BookmarkSchema } from './schemas/bookmark';
import { VCSModule } from '@/vcs/module';

@Module({
    imports: [TypegooseModule.forFeature([BookmarkSchema], 'main'), VCSModule.register('bookmarks')],
    providers: [BookmarksService],
    controllers: [BookmarksController],
    exports: [BookmarksService],
})
export class BookmarksModule {}
