import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SentryService } from '@ntegral/nestjs-sentry';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            // TODO: Use in production disableErrorMessages: true,
        }),
    );
    app.disable('x-powered-by');
    app.enableCors();
    app.useLogger(SentryService.SentryServiceInstance());
    await app.listen(8080);
}

bootstrap();
