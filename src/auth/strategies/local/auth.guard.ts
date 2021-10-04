import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ValidationRequestHeaders } from '@/auth/utils/validationHeaders.headers.decorator';
import { AppHeaders } from '@/auth/entities/headers';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    async canActivate(context: ExecutionContext): Promise<any> {
        await ValidationRequestHeaders(AppHeaders, context);

        return super.canActivate(context);
    }
}
