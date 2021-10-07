import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/module';
import { AuthModule } from '@/auth/module';
import { SiteParseModule } from '@/site-parse/module';
import { TypegooseModule } from 'nestjs-typegoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';
import { DevicesModule } from '@/devices/module';
import { BookmarksModule } from '@/bookmarks/module';

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
        BookmarksModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
})
export class AppModule {}
