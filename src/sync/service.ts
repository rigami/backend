import { Injectable, Logger } from '@nestjs/common';
import { Device } from '@/auth/devices/entities/device';
import { User } from '@/auth/users/entities/user';
import { State } from '@/sync/entities/state';
import { FoldersSyncService } from '@/sync/modules/folders/service';
import { BookmarksSyncService } from '@/sync/modules/bookmarks/service';
import { TagsSyncService } from '@/sync/modules/tags/service';
import { VCSService } from '@/utils/vcs/service';
import { Commit } from '@/utils/vcs/entities/commit';

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    constructor(
        private vcsService: VCSService,
        private foldersService: FoldersSyncService,
        private bookmarksService: BookmarksSyncService,
        private tagsService: TagsSyncService,
    ) {}

    async checkUpdate(localCommit: string, user: User) {
        return await this.vcsService.checkUpdate(localCommit, user);
    }

    async pushState(state: State, user: User, device: Device): Promise<any> {
        this.logger.log(`Push bookmarks state for user id:${user.id} from device id:${device.id}`);

        const head = await this.vcsService.getHead(user);

        if (state.commit && state.commit !== head.commit) {
            throw new Error('PULL_FIRST');
        }

        // const { rawCommit: rawLocalCommit } = this.vcsService.decodeCommit(state.commit);

        // TODO: Added check all staged items time >= local commit head

        const stage = await this.vcsService.stage(user);

        await this.bookmarksService.pushState(stage, state.bookmarks, user, device);
        await this.foldersService.pushState(stage, state.folders, user, device);
        await this.tagsService.pushState(stage, state.tags, user, device);

        const { commit } = await this.vcsService.commit(stage, user);

        this.logger.log(`Finish push bookmarks state for user id:${user.id} from device id:${device.id}`);

        return { serverCommit: commit };
    }

    async pullState(localCommit: string, user: User, device: Device): Promise<State> {
        const { commit: serverCommit } = await this.vcsService.getHead(user);

        if (serverCommit === localCommit) return null;

        this.logger.log(
            `Pull bookmarks state for user id:${user.id} from device id:${device.id} start from commit:${localCommit}`,
        );

        const commit: Commit = localCommit ? this.vcsService.decodeCommit(localCommit).rawCommit : null;

        const bookmarks = await this.bookmarksService.pullState(commit, user, device);
        const folders = await this.foldersService.pullState(commit, user, device);
        const tags = await this.tagsService.pullState(commit, user, device);

        return {
            commit: serverCommit,
            bookmarks,
            folders,
            tags,
        };
    }
}
