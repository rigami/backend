import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/auth/users/entities/user';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();

    return request.user.user;
});

export const CurUser = CurrentUser;
