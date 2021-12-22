import { Module } from '@nestjs/common';
import { UsersModule } from '@/auth/users/module';
import { AuthCommonModule } from '@/auth/module';
import { SiteParseModule } from '@/site-parse/module';
import { TypegooseModule } from 'nestjs-typegoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';
import { DevicesModule } from '@/auth/devices/module';
import { SyncModule } from '@/sync/module';
import configuration from '@/config/configuration';
import { ConfigModule } from '@nestjs/config';

const MONGO_URI = `mongodb://${process.env.DATABASE_HOST || '127.0.0.1'}:27017`;

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'cache',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-cache`,
                authSource: 'admin',
                auth: { username: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD },
            }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'main',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-main`,
                authSource: 'admin',
                auth: { username: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD },
            }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'sync',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-sync`,
                authSource: 'admin',
                auth: { username: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD },
            }),
        }),
        AuthCommonModule,
        UsersModule,
        DevicesModule,
        SiteParseModule,
        SyncModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
})
export class AppModule {}
