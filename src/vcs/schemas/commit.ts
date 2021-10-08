import { Prop, Index, ModelOptions } from '@typegoose/typegoose';
import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';

class BaseCommitSchema {
    @Prop({ required: true })
    readonly uuid!: string;

    @Type(() => Date)
    @Prop({ required: true })
    readonly date!: Date;
}

@ModelOptions({ options: { customName: 'state' } })
@Index({ userId: '' })
export class CommitSchema {
    @Prop({ required: true })
    // @Type(() => Commit)
    rootCommit: BaseCommitSchema;

    @Prop()
    // @Type(() => Commit)
    previousCommit?: BaseCommitSchema;

    @Prop({ required: true })
    // @Type(() => Commit)
    headCommit: BaseCommitSchema;

    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    model!: string;

    @IsDate()
    @Type(() => Date)
    @Prop({ required: true, default: () => new Date() })
    readonly updateDate: Date;
}
