import { Prop, Index } from '@typegoose/typegoose';
import { IsEnum } from 'class-validator';
import { STATE_ACTION } from '@/sync/entities/stateEnitity';

@Index({ hash: 'text', entityType: 'text', entityId: 'text', action: 'text' })
export class StateEntitySchema {
    @Prop({ required: true })
    userId!: string;

    @IsEnum(STATE_ACTION)
    @Prop({ required: true })
    lastAction!: string;

    @Prop({ required: true, default: () => new Date() })
    createDate?: Date;

    @Prop({ required: true, default: () => new Date() })
    updateDate?: Date;
}
