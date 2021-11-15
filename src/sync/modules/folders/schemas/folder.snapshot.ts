import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/state';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'folders' } })
@Index({ userId: 1, parentId: 1, name: 1 }, { unique: true })
@Index({ userId: 1, id: 1 }, { unique: true })
export class FolderSnapshotSchema extends StateEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    parentId: string;

    @Prop({ required: true })
    name: string;
}
