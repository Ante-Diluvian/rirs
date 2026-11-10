import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { SettingsService } from './settings/settings.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.get(SettingsService).check();

  const port = Number(app.get(ConfigService).get<string>('PORT', '3001'));
  await app.listen(port);
}
void bootstrap();
