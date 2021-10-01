import { IsString } from 'class-validator';

export class InstanceInfo {
    @IsString() readonly userAgent: string;
    @IsString() readonly name: string;
}
