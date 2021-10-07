import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/stateEntity';

@ModelOptions({ options: { customName: 'bookmarks' } })
@Index({ folderId: '' })
export class BookmarkSchema extends StateEntitySchema {
    @Prop({ required: true })
    variant: string;

    @Prop({ required: true })
    url: string;

    @Prop({ required: true })
    imageUrl: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    tagsIds: string[];

    @Prop({ required: true })
    folderId: number;
}
