import { IsDate, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Bookmark } from './bookmark';
import { Expose, Type } from 'class-transformer';

export class DeleteEntity {
    @Expose()
    @IsUUID()
    readonly id: string;

    @Expose()
    @IsDate()
    @Type(() => Date)
    readonly updateDate: Date;
}

export class State {
    @IsOptional()
    readonly commit?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Bookmark)
    readonly create?: Bookmark[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Bookmark)
    readonly update?: Bookmark[] = [];

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => DeleteEntity)
    readonly delete?: DeleteEntity[] = [];
}
