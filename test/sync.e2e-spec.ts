import request from 'supertest';
import { Test } from '@nestjs/testing';
import { SyncModule } from '@/sync/module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { UsersModule } from '@/auth/users/module';
import { v4 as UUIDv4 } from 'uuid';
import { DevicesModule } from '@/auth/devices/module';
import { AuthCommonModule } from '@/auth/module';

const authRequest = (app, user, method, path) =>
    request(app.getHttpServer())
        [method](path)
        .set('Device-Type', 'extension-chrome')
        .set('Device-Token', user.deviceToken)
        .set('User-Agent', 'e2e-test')
        .set('Accept', 'application/json')
        .auth(user.accessToken, { type: 'bearer' });

describe('Sync (e2e)', () => {
    let app: INestApplication;
    let user1;
    let user2;
    let testStartTime;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                TypegooseModule.forRootAsync({
                    connectionName: 'cache',
                    useFactory: async () => ({ uri: 'mongodb://127.0.0.1:27017/rigami-cache' }),
                }),
                TypegooseModule.forRootAsync({
                    connectionName: 'main',
                    useFactory: async () => ({ uri: 'mongodb://127.0.0.1:27017/rigami-main' }),
                }),
                TypegooseModule.forRootAsync({
                    connectionName: 'sync',
                    useFactory: async () => ({ uri: 'mongodb://127.0.0.1:27017/rigami-sync' }),
                }),
                AuthCommonModule,
                UsersModule,
                DevicesModule,
                SyncModule,
            ],
        }).compile();

        app = moduleRef.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                // TODO: Use in production disableErrorMessages: true,
            }),
        );

        await app.init();

        user1 = await request(app.getHttpServer())
            .post('/v1/auth/virtual/registration')
            .set('Device-Type', 'extension-chrome')
            .set('Device-Token', UUIDv4())
            .set('User-Agent', 'e2e-test')
            .set('Accept', 'application/json')
            .then((response) => response.body);

        user2 = await request(app.getHttpServer())
            .post('/v1/auth/virtual/registration')
            .set('Device-Type', 'extension-chrome')
            .set('Device-Token', UUIDv4())
            .set('User-Agent', 'e2e-test')
            .set('Accept', 'application/json')
            .then((response) => response.body);

        // console.log('user1:', user1);
        // console.log('user2:', user2);

        testStartTime = new Date().valueOf();
    });

    it(`Sync changes by one user`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));

        const pushResponse1 = await authRequest(app, user1, 'put', '/v1/sync/push')
            .send({
                create: [
                    {
                        tempId: '00000000-0000-0000-0000-000000000001',
                        entityType: 'folder',
                        createDate: new Date(testStartTime).toISOString(),
                        updateDate: new Date(testStartTime).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Sundry',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13314',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 100).toISOString(),
                        updateDate: new Date(testStartTime + 100).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Folder 1',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13316',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 200).toISOString(),
                        updateDate: new Date(testStartTime + 200).toISOString(),
                        payload: {
                            parentTempId: '0d39607c-8892-4f45-b0f6-58bd81a13314',
                            name: 'Folder 2',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13326',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 210).toISOString(),
                        updateDate: new Date(testStartTime + 210).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Folder 3',
                        },
                    },
                ],
                update: [],
                delete: [],
            })
            .expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('pushResponse1:', pushResponse1.body);

        const pushResponse2 = await authRequest(app, user1, 'put', '/v1/sync/push')
            .send({
                create: [
                    {
                        tempId: '00000000-0000-0000-0000-000000000001',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 150).toISOString(),
                        updateDate: new Date(testStartTime + 150).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Sundry',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13315',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 200).toISOString(),
                        updateDate: new Date(testStartTime + 200).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Folder 3',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13318',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 80).toISOString(),
                        updateDate: new Date(testStartTime + 80).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Folder 1',
                        },
                    },
                    {
                        tempId: '0d39607c-8892-4f45-b0f6-58bd81a13328',
                        entityType: 'folder',
                        createDate: new Date(testStartTime + 300).toISOString(),
                        updateDate: new Date(testStartTime + 300).toISOString(),
                        payload: {
                            parentTempId: '0d39607c-8892-4f45-b0f6-58bd81a13318',
                            name: 'Folder 2',
                        },
                    },
                ],
                update: [],
                delete: [],
            })
            .expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('pushResponse2:', pushResponse2.body);

        const pullAllData1 = await authRequest(
            app,
            user1,
            'get',
            `/v1/sync/pull?fromCommit=${pushResponse2.body.headCommit}`,
        ).expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('allData status:', pullAllData1.status);
        console.log('allData headCommit:', pullAllData1.body.headCommit);
        console.log('allData create:', pullAllData1.body.create);
        console.log('allData update:', pullAllData1.body.update);

        const checkUpdate = await authRequest(
            app,
            user1,
            'get',
            `/v1/sync/check-update?fromCommit=${pushResponse1.body.headCommit}`,
        ).expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('checkUpdate:', checkUpdate.body);

        const checkUpdateAll = await authRequest(app, user1, 'get', `/v1/sync/check-update`).expect((res) =>
            res.status != 200 ? console.error(res.body) : 0,
        );

        console.log('checkUpdateAll:', checkUpdateAll.body);

        let pullAllData = await authRequest(
            app,
            user1,
            'get',
            `/v1/sync/pull?toCommit=${checkUpdateAll.body.headCommit}`,
        ).expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('allData headCommit:', pullAllData.body.headCommit);
        console.log('allData create:', pullAllData.body.create);
        console.log('allData update:', pullAllData.body.update);

        testStartTime = Date.now();

        const sundryFolder = pullAllData.body.create.find((fodler) => fodler.payload.name === 'Sundry');
        const folder1 = pullAllData.body.create.find((fodler) => fodler.payload.name === 'Folder 1');
        const folder2 = pullAllData.body.create.find((fodler) => fodler.payload.name === 'Folder 2');

        await new Promise((resolve) => setTimeout(resolve, 600));

        const pushResponse3 = await authRequest(app, user1, 'put', '/v1/sync/push')
            .send({
                localCommit: pullAllData.body.headCommit,
                create: [],
                update: [
                    {
                        id: sundryFolder.id,
                        entityType: 'folder',
                        createDate: sundryFolder.createDate,
                        updateDate: new Date(testStartTime + 100).toISOString(),
                        payload: {
                            parentId: '00000000-0000-0000-0000-000000000000',
                            name: 'Sundry upd',
                        },
                    },
                ],
                delete: [
                    {
                        id: folder1.id,
                        entityType: 'folder',
                        deleteDate: new Date(testStartTime + 110).toISOString(),
                    },
                    {
                        id: folder2.id,
                        entityType: 'folder',
                        deleteDate: new Date(testStartTime + 110).toISOString(),
                    },
                ],
            })
            .expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('pushResponse3:', pushResponse3.body);

        pullAllData = await authRequest(
            app,
            user1,
            'get',
            `/v1/sync/pull?toCommit=${pushResponse3.body.headCommit}`,
        ).expect((res) => (res.status != 200 ? console.error(res.body) : 0));

        console.log('allData headCommit:', pullAllData.body.headCommit);
        console.log('allData create:', pullAllData.body.create);
        console.log('allData update:', pullAllData.body.update);
    });

    afterAll(async () => {
        await app.close();
    });
});
