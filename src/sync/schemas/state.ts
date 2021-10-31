import { Prop } from '@typegoose/typegoose';
import { IsEnum } from 'class-validator';
import { STATE_ACTION } from '@/sync/entities/synced';

export class StateEntitySchema {
    @Prop({ required: true })
    userId!: string;

    @IsEnum(STATE_ACTION)
    @Prop({ required: true })
    lastAction!: string;

    @Prop({ required: true })
    createDate!: Date;

    @Prop({ required: true })
    updateDate!: Date;

    @Prop({ required: true })
    readonly createCommit: Date;

    @Prop({ required: true })
    readonly updateCommit: Date;
}
