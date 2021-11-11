import { ModelOptions, Prop } from '@typegoose/typegoose';
import { IsEnum } from 'class-validator';

export enum HISTORY_ENTITY {
    'bookmark' = 'bookmark',
    'folder' = 'folder',
    'tag' = 'tag',
}

export enum HISTORY_ACTION {
    // 'create' = 'create',
    // 'move' = 'move',
    // 'rename' = 'rename',
    // 'update' = 'update',
    'delete' = 'delete',
}

@ModelOptions({ options: { customName: 'history' } })
export class HistorySchema {
    @Prop({ required: true })
    userId!: string;

    @IsEnum(HISTORY_ACTION)
    @Prop({ required: true })
    action!: string;

    @Prop({ required: true })
    date!: Date;

    @Prop({ required: true })
    commit!: Date;

    @IsEnum(HISTORY_ENTITY)
    @Prop({ required: true })
    entityType: string;

    @Prop({ required: true })
    entityId: string;

    // @Prop({ required: true })
    // entityChanges: any;
}
