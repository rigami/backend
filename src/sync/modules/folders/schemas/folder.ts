import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/stateEntity';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'folders' } })
@Index({ folderId: '' })
export class FolderSchema extends StateEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop()
    parentId: string;

    @Prop({ required: true })
    name: string;
}
