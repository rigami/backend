import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/state';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'bookmarks' } })
@Index({ userId: 1, folderId: 1, title: 1 }, { unique: true })
@Index({ userId: 1, folderId: 1, url: 1 }, { unique: true })
@Index({ userId: 1, id: 1 }, { unique: true })
export class BookmarkSnapshotSchema extends StateEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    variant: string;

    @Prop({ required: true })
    url: string;

    @Prop()
    imageUrl: string;

    @Prop({ required: true })
    title: string;

    @Prop()
    description: string;

    @Prop({ required: true })
    tagsIds: string[];

    @Prop({ required: true })
    folderId: string;
}
