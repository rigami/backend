import { IsString, IsOptional, IsDate, IsBoolean, IsUUID } from 'class-validator';

export class User {
    @IsUUID()
    @IsOptional()
    readonly id?: string;

    @IsString()
    readonly username: string;

    @IsString()
    @IsOptional()
    readonly password?: string;

    @IsBoolean()
    readonly isVirtual: boolean;

    @IsBoolean()
    @IsOptional()
    readonly isTemp?: boolean = false;

    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
