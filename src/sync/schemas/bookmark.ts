import { Prop, Index } from '@typegoose/typegoose';

@Index({ hash: 'text', entityType: 'text', entityId: 'text', action: 'text' })
export class Bookmark {
    @Prop({
        required: true,
        unique: true,
    })
    hash!: string;

    @Prop({ required: true })
    entityType!: string;

    @Prop({ required: true })
    entityId!: number;

    @Prop({ required: true })
    action!: number;

    @Prop()
    payload?: any;

    @Prop({
        required: true,
        enum: ['poster', 'icon', 'small-icon'],
    })
    type!: string;

    @Prop({ required: true, default: () => new Date() })
    date?: Date;
}
