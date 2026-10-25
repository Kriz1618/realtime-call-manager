import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // WEB_ORIGIN must match the browser's Origin exactly: no trailing slash.
  app.enableCors({ origin: config.getOrThrow<string>('WEB_ORIGIN') });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Realtime Call Manager API')
    .setDescription('API for incoming call webhooks and call management.')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(config.get<number>('API_PORT') ?? 3000);
}
void bootstrap();
