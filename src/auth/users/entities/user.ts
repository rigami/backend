import { IsString, IsOptional, IsDate, IsBoolean, IsUUID, IsEnum } from 'class-validator';

export enum ROLE {
    user = 'user',
    virtual_user = 'virtual_user',
    moderator = 'moderator',
}

export class User {
    @IsUUID()
    @IsOptional()
    readonly id?: string;

    @IsString()
    readonly username: string;

    @IsString()
    @IsOptional()
    readonly password?: string;

    @IsEnum(ROLE)
    readonly role: ROLE;

    @IsBoolean()
    @IsOptional()
    readonly isTemp?: boolean = false;

    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
