import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { Commit as CommitSchema } from './schemas/commit';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        @InjectModel(CommitSchema)
        private readonly commitModel: ReturnModelType<typeof CommitSchema>,
    ) {
        commitModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop commits! Because set development mode');
        });
    }

    async push(): Promise<string[]> {
        return ['ok'];
    }
}
