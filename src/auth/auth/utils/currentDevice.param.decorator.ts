import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Device } from '@/auth/devices/entities/device';

export const CurrentDevice = createParamDecorator((data: unknown, ctx: ExecutionContext): Device => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.device;
});
