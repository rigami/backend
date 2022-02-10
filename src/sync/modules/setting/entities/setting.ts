import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Setting extends DefaultEntity {
    @Expose()
    @IsString()
    readonly name: string;

    @Expose()
    @IsString()
    readonly value: string;
}
