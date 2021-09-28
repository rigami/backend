import { Module } from '@nestjs/common';
import { UsersModule } from '@/users/module';
import { AuthModule } from '@/auth/module';
import { SiteParseModule } from '@/site-parse/module';
import { TypegooseModule } from 'nestjs-typegoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';

@Module({
    imports: [
        TypegooseModule.forRoot('mongodb://localhost/rigami-cache'),
        AuthModule,
        UsersModule,
        SiteParseModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
})
export class AppModule {}
