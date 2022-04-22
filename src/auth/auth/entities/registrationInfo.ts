import { IsString } from 'class-validator';

export class RegistrationInfo {
    @IsString() readonly username!: string;
    @IsString() readonly password: string;
}
