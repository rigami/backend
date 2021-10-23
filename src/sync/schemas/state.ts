import { Prop, Index } from '@typegoose/typegoose';
import { IsEnum } from 'class-validator';
import { STATE_ACTION } from '@/sync/entities/synced';
import { CommittedEntitySchema } from '@/utils/vcs/schemas/committedEntity';

@Index({ hash: 'text', entityType: 'text', entityId: 'text', action: 'text' })
export class StateEntitySchema extends CommittedEntitySchema {
    @Prop({ required: true })
    userId!: string;

    @IsEnum(STATE_ACTION)
    @Prop({ required: true })
    lastAction!: string;

    @Prop({ required: true })
    createDate!: Date;

    @Prop({ required: true })
    updateDate!: Date;
}
