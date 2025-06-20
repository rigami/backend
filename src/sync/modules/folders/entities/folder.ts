import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Expose } from 'class-transformer';
import { DefaultEntity } from '@/utils/defaultEntity';

export class Folder extends DefaultEntity {
    @Expose()
    @IsUUID()
    @IsOptional()
    readonly parentId?: string;

    @Expose()
    @IsString()
    readonly name: string;
}
