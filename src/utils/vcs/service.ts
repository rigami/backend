import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { CommitSchema } from './schemas/commit';
import base64url from 'base64url';
import { Commit } from './entities/commit';
import { Stage } from '@/utils/vcs/entities/stage';
import { plainToClass } from 'class-transformer';

export function decodeCommit(commit: string): Commit {
    return plainToClass(Commit, JSON.parse(base64url.decode(commit)));
}

export function encodeCommit(rawCommit: Commit): string {
    return base64url(JSON.stringify(rawCommit));
}

@Injectable()
export class VCSService {
    private readonly logger = new Logger(VCSService.name);

    constructor(
        @InjectModel(CommitSchema)
        private readonly commitModel: ReturnModelType<typeof CommitSchema>,
        @Inject('VCS_CONFIG_OPTIONS') private options,
    ) {}

    async checkUpdate(localCommit: string, user: User) {
        const { commit: serverCommit } = await this.getHead(user);

        if (serverCommit && !localCommit) {
            return {
                existUpdate: true,
                headCommit: serverCommit,
            };
        }

        if (!serverCommit || !localCommit || serverCommit === localCommit) {
            return {
                existUpdate: false,
                headCommit: serverCommit,
            };
        }

        return {
            existUpdate: true,
            headCommit: serverCommit,
        };
    }

    decodeCommit(commit: string) {
        return { commit, rawCommit: decodeCommit(commit) };
    }

    async getHead(user: User) {
        const serverState = await this.commitModel.findOne({ userId: user.id, model: this.options.moduleName });

        if (!serverState) {
            return {
                commit: null,
                rawCommit: null,
            };
        }

        const rawCommit: Commit = {
            head: serverState.head,
            root: serverState.root,
            previous: serverState.previous,
        };
        const commit = encodeCommit(rawCommit);

        return { commit, rawCommit };
    }

    async stage(user: User): Promise<Stage> {
        this.logger.log(`Stage for model:${this.options.moduleName} of user id:${user.id}`);
        const commit: Date = new Date();

        return { commit };
    }

    async commit(stage: Stage, user: User): Promise<any> {
        this.logger.log(`Commit for model:${this.options.moduleName} of user id:${user.id}`);
        let commit: string;
        let rawCommit: Commit;
        const previewCommit = await this.commitModel.findOne({ userId: user.id, model: this.options.moduleName });

        if (previewCommit) {
            const root = previewCommit.root;
            const previous = previewCommit.head;
            const head = stage.commit;
            rawCommit = {
                head,
                root,
                previous,
            };
            commit = encodeCommit(rawCommit);

            await this.commitModel.updateOne(
                { userId: user.id, model: this.options.moduleName },
                { $set: { head, previous, root, updateDate: rawCommit.head } },
            );
        } else {
            const head = stage.commit;
            rawCommit = {
                head,
                root: head,
                previous: null,
            };
            commit = encodeCommit(rawCommit);

            await this.commitModel.create({
                userId: user.id,
                model: this.options.moduleName,
                root: head,
                head,
                previous: null,
                updateDate: rawCommit.head,
            });
        }

        return { commit, rawCommit };
    }
}
