import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/users/entities/user';
import { CommitSchema } from './schemas/commit';
import base64url from 'base64url';
import { v4 as UUIDv4 } from 'uuid';
import { BaseCommit, Commit } from './entities/commit';
import { pick } from 'lodash';

function decodeCommit(commit: string): Commit {
    return JSON.parse(base64url.decode(commit));
}

function encodeCommit(rawCommit: Commit): string {
    return base64url(JSON.stringify(rawCommit));
}

@Injectable()
export class VCSService {
    private readonly logger = new Logger(VCSService.name);

    constructor(
        @InjectModel(CommitSchema)
        private readonly commitModel: ReturnModelType<typeof CommitSchema>,
        @Inject('VCS_CONFIG_OPTIONS') private options,
    ) {
        console.log('options:', options);
        commitModel.deleteMany({}, (err) => {
            if (err) {
                this.logger.error(err);
                return;
            }

            this.logger.warn('Drop bookmarks states! Because set development mode');
        });
    }

    async checkUpdate(commit: string, user: User) {
        const serverState = await this.commitModel.findOne({ userId: user.id, model: this.options.moduleName });
        const rawCommit: Commit = decodeCommit(commit);

        if (!serverState || serverState.headCommit.uuid === rawCommit.uuid) {
            return {
                existUpdate: false,
            };
        }

        return {
            existUpdate: true,
            serverCommit: encodeCommit({
                ...serverState.headCommit,
                rootCommit: serverState.rootCommit,
                previousCommit: serverState.previousCommit,
            }),
        };
    }

    async commit(user: User): Promise<any> {
        let commit: string;
        let rawCommit: Commit;
        const previewCommit = await this.commitModel.findOne({ userId: user.id, model: this.options.moduleName });

        if (previewCommit) {
            const rootCommit: BaseCommit = pick(previewCommit.rootCommit, ['uuid', 'date']);
            const previousCommit: BaseCommit = pick(previewCommit.headCommit, ['uuid', 'date']);
            const headCommit: BaseCommit = {
                uuid: UUIDv4(),
                date: new Date(),
            };
            rawCommit = {
                ...headCommit,
                rootCommit,
                previousCommit,
            };
            commit = base64url(JSON.stringify(rawCommit));

            await this.commitModel.updateOne(
                { userId: user.id, model: this.options.moduleName },
                { $set: { headCommit, previousCommit, rootCommit, updateDate: rawCommit.date } },
            );
        } else {
            const rootCommit: Commit = {
                uuid: UUIDv4(),
                date: new Date(),
            };
            rawCommit = {
                ...rootCommit,
                rootCommit,
                previousCommit: null,
            };
            commit = encodeCommit(rawCommit);

            await this.commitModel.create({
                userId: user.id,
                model: this.options.moduleName,
                rootCommit,
                headCommit: rootCommit,
                previousCommit: null,
                updateDate: rawCommit.date,
            });
        }

        return { commit, rawCommit };
    }
}
