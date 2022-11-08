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
import { WallpapersModule } from '@/wallpapers/module';
import { ConsoleModule } from '@/console/module';
import { SentryModule } from '@ntegral/nestjs-sentry';
import packageJson from '../../package.json';

const MONGO_URI = `mongodb://${process.env.DATABASE_HOST || '127.0.0.1'}:27017`;
const MONGO_AUTH =
    process.env.DATABASE_USER && process.env.DATABASE_PASSWORD
        ? {
              authSource: 'admin',
              auth: { username: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD },
          }
        : {};
const SENTRY_DSN = 'https://3588c3ab8b244beb943e58e00a92107c@o527213.ingest.sentry.io/4504125314170880';

@Module({
    imports: [
        SentryModule.forRoot({
            dsn: SENTRY_DSN,
            debug: process.env.NODE_ENV === 'development',
            environment: process.env.NODE_ENV || 'unknown',
            release: packageJson.version,
            beforeSend: (event) => {
                if (['log', 'info'].includes(event.level)) {
                    return null;
                } else {
                    return event;
                }
            },
        }),
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'cache',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-cache`,
                ...MONGO_AUTH,
            }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'main',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-main`,
                ...MONGO_AUTH,
            }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'sync',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-sync`,
                ...MONGO_AUTH,
            }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'wallpapers',
            useFactory: async () => ({
                uri: `${MONGO_URI}/rigami-wallpapers`,
                ...MONGO_AUTH,
            }),
        }),
        AuthCommonModule,
        UsersModule,
        DevicesModule,
        SiteParseModule,
        SyncModule,
        WallpapersModule,
        ConsoleModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
})
export class AppModule {}
