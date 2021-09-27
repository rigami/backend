import { IsString, IsNumber, IsOptional } from 'class-validator';

export class User {
    @IsNumber() @IsOptional() readonly id: number;
    @IsString() readonly username: string;
    @IsString() readonly password: string;
}
