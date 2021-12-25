import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from 'nestjs-typegoose';
import { TagSnapshotSchema } from './schemas/tag.snapshot';
import { ReturnModelType } from '@typegoose/typegoose';
import { User } from '@/auth/users/entities/user';
import { DeleteEntity, DeletePairEntity } from '@/sync/entities/delete';
import { Stage } from '@/utils/vcs/entities/stage';
import { Commit } from '@/utils/vcs/entities/commit';
import { STATE_ACTION } from '@/sync/entities/snapshot';
import { plainToClass } from 'class-transformer';
import { Tag } from './entities/tag';
import { TagSnapshot } from '@/sync/modules/tags/entities/tag.snapshot';
import { HISTORY_ACTION, HistorySchema } from '@/sync/schemas/history';
import { ItemSyncService } from '@/sync/modules/ItemSyncService';
import { CreatePairEntity, SyncPairEntity } from '@/sync/entities/sync';
import { Action } from '@/sync/utils/actions';

@Injectable()
export class TagsSyncService extends ItemSyncService<Tag, TagSnapshot> {
    private readonly logger = new Logger(TagsSyncService.name);

    constructor(
        @InjectModel(TagSnapshotSchema)
        readonly tagModel: ReturnModelType<typeof TagSnapshotSchema>,
        @InjectModel(HistorySchema)
        readonly historyModel: ReturnModelType<typeof HistorySchema>,
    ) {
        super(tagModel, historyModel);
    }

    async merge(
        clientTag: CreatePairEntity | SyncPairEntity,
        cloudTag: SyncPairEntity,
        desiredAction: Action,
        user: User,
    ) {
        if (cloudTag && clientTag.payload.colorKey === cloudTag.payload.colorKey) {
            return super.merge(clientTag, cloudTag, desiredAction, user);
        }

        let mutatedPayload;

        if (desiredAction === Action.UPDATE_SERVER || desiredAction === Action.CREATE_SERVER) {
            const tags = await this.tagModel.find({ userId: user.id });

            const colorsKeys = tags.map(({ colorKey }) => colorKey).sort((a, b) => a - b);

            let nextColorKey = 1;
            while (colorsKeys[nextColorKey - 1] === nextColorKey && nextColorKey <= colorsKeys.length) {
                nextColorKey += 1;
            }

            mutatedPayload = { ...clientTag.payload, colorKey: nextColorKey };
        } else {
            mutatedPayload = { ...clientTag.payload, colorKey: cloudTag.payload.colorKey };
        }

        return super.merge(
            { ...clientTag, payload: mutatedPayload },
            { ...cloudTag, payload: mutatedPayload },
            desiredAction,
            user,
        );
    }

    async processSequentially(tags, processTag) {
        const pairTagsIds = {};

        for (const entity of tags) {
            const pair = await processTag(entity);

            pairTagsIds[pair.localId] = pair.cloudId;
        }

        return pairTagsIds;
    }

    async exist(searchTag: Tag, user: User): Promise<SyncPairEntity> {
        let tag;

        if (searchTag.id) {
            tag = await this.existById(searchTag.id, user);

            if (tag) return tag;
        }

        tag = await this.tagModel
            .findOne({
                name: searchTag.name,
                userId: user.id,
            })
            .lean()
            .exec();

        return tag && plainToClass(SyncPairEntity, { ...tag, payload: tag }, { excludeExtraneousValues: true });
    }

    async create(tag: TagSnapshot, user: User, stage: Stage) {
        const createdTag = (
            await this.tagModel.create({
                ...tag,
                lastAction: STATE_ACTION.create,
                userId: user.id,
                createCommit: stage.commit,
                updateCommit: stage.commit,
            })
        ).toJSON();

        return plainToClass(SyncPairEntity, { ...createdTag, payload: createdTag }, { excludeExtraneousValues: true });
    }

    async update(tag: TagSnapshot, user: User, stage: Stage) {
        await this.tagModel.updateOne(
            {
                id: tag.id,
                userId: user.id,
            },
            {
                $set: {
                    ...tag,
                    lastAction: STATE_ACTION.update,
                    userId: user.id,
                    createCommit: stage.commit,
                    updateCommit: stage.commit,
                },
            },
        );

        const updatedTag = await this.tagModel.findOne({ id: tag.id, userId: user.id }).lean().exec();

        return plainToClass(SyncPairEntity, { ...updatedTag, payload: updatedTag }, { excludeExtraneousValues: true });
    }

    async delete(deleteEntity: DeletePairEntity, user: User, stage: Stage) {
        await this.tagModel.deleteOne({
            id: deleteEntity.id,
            userId: user.id,
        });
        await this.historyModel.create({
            userId: user.id,
            action: HISTORY_ACTION.delete,
            entityType: 'tag',
            entityId: deleteEntity.id,
            date: deleteEntity.deleteDate,
            commit: stage.commit,
        });
    }

    async get(fromCommit: Commit, toCommit: Commit, user: User) {
        let query;

        if (fromCommit) {
            query = {
                userId: user.id,
                updateCommit: { $gt: fromCommit.head },
            };
        } else {
            query = {
                userId: user.id,
            };
        }

        const createTags = await this.tagModel
            .find({
                ...query,
                lastAction: STATE_ACTION.create,
            })
            .lean()
            .exec();

        const updateTags = await this.tagModel
            .find({
                ...query,
                lastAction: STATE_ACTION.update,
            })
            .lean()
            .exec();

        if (!fromCommit) {
            return {
                create: [...createTags, ...updateTags].map((tag) =>
                    plainToClass(
                        TagSnapshot,
                        { ...tag, lastAction: STATE_ACTION.create },
                        { excludeExtraneousValues: true },
                    ),
                ),
                update: [],
                delete: [],
            };
        }

        const deletedTags = await this.historyModel
            .find({
                userId: user.id,
                commit: query.updateCommit,
                entityType: 'tag',
                action: STATE_ACTION.delete,
            })
            .lean()
            .exec();

        return {
            create: createTags.map((tag) => plainToClass(TagSnapshot, tag, { excludeExtraneousValues: true })),
            update: updateTags.map((tag) => plainToClass(TagSnapshot, tag, { excludeExtraneousValues: true })),
            delete: deletedTags.map((deletedEntity) =>
                plainToClass(
                    DeleteEntity,
                    { ...deletedEntity, id: deletedEntity.entityId },
                    { excludeExtraneousValues: true },
                ),
            ),
        };
    }
}
