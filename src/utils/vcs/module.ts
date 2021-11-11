import { DynamicModule, Module } from '@nestjs/common';
import { VCSService } from './service';
import { TypegooseModule } from 'nestjs-typegoose';
import { CommitSchema } from './schemas/commit';

@Module({})
export class VCSModule {
    static register(moduleName: string): DynamicModule {
        return {
            module: VCSModule,
            imports: [TypegooseModule.forFeature([CommitSchema], 'sync')],
            providers: [
                {
                    provide: 'VCS_CONFIG_OPTIONS',
                    useValue: { moduleName },
                },
                VCSService,
            ],
            exports: [VCSService],
        };
    }
}
