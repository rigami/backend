import { SyncController } from './controller';
import { SyncService } from './service';
import { Test } from '@nestjs/testing';
import { TypegooseModule } from 'nestjs-typegoose';
import { Commit } from '@/sync/schemas/commit';

describe('CatsController', () => {
    let syncController: SyncController;
    let syncService: SyncService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                TypegooseModule.forRoot('mongodb://localhost/rigami-cache'),
                TypegooseModule.forFeature([Commit]),
            ],
            providers: [SyncService],
            controllers: [SyncController],
            exports: [SyncService],
        }).compile();

        syncService = moduleRef.get<SyncService>(SyncService);
        syncController = moduleRef.get<SyncController>(SyncController);
    });

    describe('push', () => {
        it('should push current state', async () => {
            const result = ['test'];
            // jest.spyOn(syncService, 'push').mockImplementation(async () => result);

            expect(await syncController.push({ user: { id: 1 } })).toStrictEqual(result);
        });
    });
});
