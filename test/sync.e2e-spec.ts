import request from 'supertest';
import { Test } from '@nestjs/testing';
import { SyncModule } from '@/sync/module';
import { INestApplication } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { AuthModule } from '@/auth/module';
import { UsersModule } from '@/users/module';

describe('Sync (e2e)', () => {
    let app: INestApplication;
    let signDeviceToken;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [TypegooseModule.forRoot('mongodb://localhost/rigami-cache'), AuthModule, UsersModule, SyncModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        signDeviceToken = await request(app.getHttpServer())
            .post('/auth/sign-device')
            .send({ uuid: '9c7fc221-60e0-497a-ad13-c526d71f1fba', browser: 'Chrome' })
            .set('Accept', 'application/json')
            .then((response) => response.body.signDeviceToken);
    });

    it(`/GET push`, () => {
        return request(app.getHttpServer()).get('/sync/push').auth(signDeviceToken, { type: 'bearer' }).expect(200);
    });
});
