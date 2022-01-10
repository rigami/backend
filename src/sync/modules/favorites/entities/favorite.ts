import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Favorite extends DefaultEntity {
    @Expose()
    @IsString()
    readonly itemId: string;

    @Expose()
    @IsString()
    readonly itemType: string;
}
