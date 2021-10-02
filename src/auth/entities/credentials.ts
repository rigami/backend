import { IsOptional, IsString } from 'class-validator';
import { User } from '@/users/entities/user';
import { Device } from '@/devices/entities/device';

export class Credentials {
    @IsString() @IsOptional() readonly user?: User;
    @IsString() @IsOptional() readonly device?: Device;
}
