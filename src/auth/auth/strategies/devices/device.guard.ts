import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DevicesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const devices = this.reflector.get<string[]>('devices', context.getHandler());
        if (!devices) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const device = request.user?.device;

        return devices.includes(device.type);
    }
}
