import { IsString, IsNumber, IsOptional, IsDate, IsBoolean } from 'class-validator';

export class User {
    @IsNumber() @IsOptional() readonly id: number;
    @IsString() readonly username: string;
    @IsString() readonly password: string;
    @IsBoolean() readonly isVirtual: boolean;
    @IsDate() @IsOptional() readonly createDate: Date;
}
