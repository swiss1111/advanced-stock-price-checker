import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';
import { formatUrl } from './utils/url.utils';


dotenv.config();

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule);

  if (process.env.SWAGGER_URL) {
    const options = new DocumentBuilder()
      .setTitle('Example API')
      .setDescription('API description')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(process.env.SWAGGER_URL, app, document);
  }

  await app.listen(process.env.APP_PORT || 3000);

  const url = await app.getUrl();

  logger.log(`Server is running on port ${formatUrl(url)}`);

  if (process.env.SWAGGER_URL) {
    logger.log(`Swagger is running on port ${formatUrl(url)}${process.env.SWAGGER_URL}`);
  }
}

bootstrap();
