import { DynamicModule, Module } from '@nestjs/common';
import { SSEService } from './service';

@Module({})
export class SSEModule {
    static register(): DynamicModule {
        return {
            module: SSEModule,
            providers: [SSEService],
            exports: [SSEService],
        };
    }
}
