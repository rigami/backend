import { Injectable, Logger } from '@nestjs/common';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { FoldersSyncService } from '@/sync/modules/folders/service';
import { BookmarksSyncService } from '@/sync/modules/bookmarks/service';
import { TagsSyncService } from '@/sync/modules/tags/service';
import { VCSService } from '@/utils/vcs/service';
import { Commit } from '@/utils/vcs/entities/commit';
import { PullResponseEntity } from '@/sync/entities/pullResponse';
import { PullRequestEntity } from '@/sync/entities/pullReqest';
import { PushResponseEntity } from '@/sync/entities/pushResponse';
import { PushRequestEntity } from '@/sync/entities/pushRequest';
import { CheckUpdateRequestEntity } from '@/sync/entities/checkUpdateRequest';
import { CheckUpdateResponseEntity } from '@/sync/entities/checkUpdateResponse';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private vcsService: VCSService,
        private foldersService: FoldersSyncService,
        private bookmarksService: BookmarksSyncService,
        private tagsService: TagsSyncService,
    ) {}

    async checkUpdate(checkUpdateRequest: CheckUpdateRequestEntity, user: User): Promise<CheckUpdateResponseEntity> {
        return await this.vcsService.checkUpdate(checkUpdateRequest.fromCommit, user);
    }

    async pushState(pushRequest: PushRequestEntity, user: User, device: Device): Promise<PushResponseEntity> {
        this.logger.log(`Push state {user.id:${user.id} device.id:${device.id}}...`);

        const { commit: serverHeadCommit } = await this.vcsService.getHead(user);

        const stage = await this.vcsService.stage(user);

        await this.bookmarksService.pushState(stage, pushRequest.bookmarks, user, device);
        await this.foldersService.pushState(stage, pushRequest.folders, user, device);
        await this.tagsService.pushState(stage, pushRequest.tags, user, device);

        const { commit: newServerHeadCommit } = await this.vcsService.commit(stage, user);

        this.logger.log(`Success push state {user.id:${user.id} device.id:${device.id}}`);

        return {
            existUpdate: serverHeadCommit !== pushRequest.localCommit,
            fromCommit: pushRequest.localCommit || null,
            toCommit: serverHeadCommit,
            headCommit: newServerHeadCommit,
        };
    }

    async pullState(pullRequest: PullRequestEntity, user: User, device: Device): Promise<PullResponseEntity> {
        const { commit: serverHeadCommit } = await this.vcsService.getHead(user);

        if (serverHeadCommit === pullRequest.fromCommit) return null;

        this.logger.log(
            `Pull bookmarks state {user.id:${user.id} device.id:${device.id}}
            start commit:${pullRequest.fromCommit}
            end commit:${pullRequest.toCommit}`,
        );

        const fromRawCommit: Commit = pullRequest.fromCommit
            ? this.vcsService.decodeCommit(pullRequest.fromCommit).rawCommit
            : null;
        const toRawCommit: Commit = pullRequest.toCommit
            ? this.vcsService.decodeCommit(pullRequest.toCommit).rawCommit
            : null;

        const bookmarks = await this.bookmarksService.pullState(fromRawCommit, toRawCommit, user, device);
        const folders = await this.foldersService.pullState(fromRawCommit, toRawCommit, user, device);
        const tags = await this.tagsService.pullState(fromRawCommit, toRawCommit, user, device);

        return {
            headCommit: serverHeadCommit,
            bookmarks,
            folders,
            tags,
        };
    }
}
