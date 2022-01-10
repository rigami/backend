import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/state';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'favorites' } })
@Index({ itemId: 1, itemType: 1 }, { unique: true })
export class FavoriteSnapshotSchema extends StateEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    itemId: string;

    @Prop({ required: true })
    itemType: string;
}
