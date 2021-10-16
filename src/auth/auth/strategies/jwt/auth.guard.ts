import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ValidationRequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { AppHeaders } from '@/auth/auth/entities/headers';

@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard('jwt-refresh') {
    async canActivate(context: ExecutionContext): Promise<any> {
        await ValidationRequestHeaders(AppHeaders, context);

        return super.canActivate(context);
    }
}

@Injectable()
export class JwtAccessAuthGuard extends AuthGuard('jwt-access') {
    async canActivate(context: ExecutionContext): Promise<any> {
        await ValidationRequestHeaders(AppHeaders, context);

        return super.canActivate(context);
    }
}
