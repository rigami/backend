import { IsString, IsUUID } from 'class-validator';

export class InstanceInfo {
    @IsUUID() readonly uuid: string;
    @IsString() readonly browser: string;
}
