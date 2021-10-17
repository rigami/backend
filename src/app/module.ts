import { Module } from '@nestjs/common';
import { UsersModule } from '@/auth/users/module';
import { AuthModule } from '@/auth/auth/module';
import { SiteParseModule } from '@/site-parse/module';
import { TypegooseModule } from 'nestjs-typegoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';
import { DevicesModule } from '@/auth/devices/module';
import { SyncModule } from '@/sync/module';

@Module({
    imports: [
        TypegooseModule.forRootAsync({
            connectionName: 'cache',
            useFactory: async () => ({ uri: 'mongodb://localhost/rigami-cache' }),
        }),
        TypegooseModule.forRootAsync({
            connectionName: 'main',
            useFactory: async () => ({ uri: 'mongodb://localhost/rigami-main' }),
        }),
        AuthModule,
        UsersModule,
        DevicesModule,
        SiteParseModule,
        SyncModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
})
export class AppModule {}
