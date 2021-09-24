import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.useGlobalPipes(
        new ValidationPipe({
            // TODO: Use in production disableErrorMessages: true,
        }),
    );
    app.disable('x-powered-by');
    await app.listen(8080);
}
bootstrap();
