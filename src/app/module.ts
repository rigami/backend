import { Module } from '@nestjs/common';
import { UsersModule } from '../users/module';
import { AuthModule } from '../auth/module';
import { SiteParseModule } from '../site-parse/module';

@Module({
    imports: [AuthModule, UsersModule, SiteParseModule],
})
export class AppModule {}
