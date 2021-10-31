import { IsString, IsNumber, IsOptional, IsDate, IsBoolean } from 'class-validator';

export class User {
    @IsNumber() @IsOptional() readonly id?: string;
    @IsString() readonly email: string;
    @IsString() @IsOptional() readonly password?: string;
    @IsBoolean() readonly isVirtual: boolean;
    @IsDate() @IsOptional() readonly createDate?: Date;
}
