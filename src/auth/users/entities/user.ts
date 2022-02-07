import { IsBoolean, IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { STATUS } from '@/auth/utils/status.enum';

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

    @IsEnum(STATUS)
    readonly status?: STATUS = STATUS.active;

    @IsDate()
    readonly statusChangeDate?: Date;

    @IsDate()
    @IsOptional()
    readonly createDate?: Date;
}
