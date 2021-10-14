import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { v4 as UUIDv4 } from 'uuid';
import { CommittedEntitySchema } from '@/vcs/schemas/committedEntity';
import { Type } from 'class-transformer';

@ModelOptions({ options: { customName: 'deleted-bookmarks' } })
@Index({ folderId: '' })
export class DeletedBookmarkSchema extends CommittedEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    @Type(() => Date)
    updateDate!: Date;
}
