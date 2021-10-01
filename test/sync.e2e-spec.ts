import request from 'supertest';
import { Test } from '@nestjs/testing';
import { SyncModule } from '@/sync/module';
import { INestApplication } from '@nestjs/common';
import { TypegooseModule } from 'nestjs-typegoose';
import { AuthModule } from '@/auth/module';
import { UsersModule } from '@/users/module';
import { v4 as UUIDv4 } from 'uuid';

describe('Sync (e2e)', () => {
    let app: INestApplication;
    let device1;
    let device2;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [TypegooseModule.forRoot('mongodb://localhost/rigami-cache'), AuthModule, UsersModule, SyncModule],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();

        device1 = await request(app.getHttpServer())
            .post('/auth/sign-device')
            .send({ uuid: UUIDv4(), browser: 'Chrome' })
            .set('Accept', 'application/json')
            .then((response) => response.body.signDeviceToken);

        device2 = await request(app.getHttpServer())
            .post('/auth/sign-device')
            .send({ uuid: UUIDv4(), browser: 'Chrome' })
            .set('Accept', 'application/json')
            .then((response) => response.body.signDeviceToken);
    });

    it(`Push local state`, () => {
        return request(app.getHttpServer())
            .post('/sync/push')
            .send({ a: 'a', b: 'b' })
            .auth(device1, { type: 'bearer' })
            .expect(200);
    });

    afterAll(async () => {
        await app.close();
    });
});
