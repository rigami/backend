import { IsString } from 'class-validator';

export class RegistrationInfo {
    @IsString() readonly email: string;
    @IsString() readonly password: string;
    @IsString() readonly browser: string;
}
