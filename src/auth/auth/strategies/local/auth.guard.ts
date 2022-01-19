import { ExecutionContext, Injectable } from '@nestjs/common';
import { ValidationRequestHeaders } from '@/auth/auth/utils/validationHeaders.headers.decorator';
import { AppHeaders } from '@/auth/auth/entities/headers';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    async canActivate(context: ExecutionContext): Promise<any> {
        await ValidationRequestHeaders(AppHeaders, context);

        return super.canActivate(context);
    }
}
