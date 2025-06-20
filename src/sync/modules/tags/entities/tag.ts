import { IsNumber, IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Tag extends DefaultEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsNumber()
    readonly colorKey: number;
}
