import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createValidationPipe } from './common/validation';

export const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3000';
export const SWAGGER_PATH = 'docs';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  app.useGlobalPipes(createValidationPipe());

  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN', DEFAULT_FRONTEND_ORIGIN),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Librarium API')
    .setDescription('REST API for loans, reservations and fines')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(SWAGGER_PATH, app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );
}
