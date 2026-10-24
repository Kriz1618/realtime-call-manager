import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // WEB_ORIGIN must match the browser's Origin exactly: no trailing slash.
  app.enableCors({ origin: config.getOrThrow<string>('WEB_ORIGIN') });
  app.enableShutdownHooks();

  await app.listen(config.get<number>('API_PORT') ?? 3000);
}
void bootstrap();
