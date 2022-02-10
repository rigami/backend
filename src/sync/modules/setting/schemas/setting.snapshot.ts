import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { StateEntitySchema } from '@/sync/schemas/state';
import { v4 as UUIDv4 } from 'uuid';

@ModelOptions({ options: { customName: 'settings' } })
@Index({ userId: 1, name: 1 }, { unique: true })
@Index({ userId: 1, id: 1 }, { unique: true })
export class SettingSnapshotSchema extends StateEntitySchema {
    @Prop({ required: true, default: () => UUIDv4() })
    id: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    value: string;
}
