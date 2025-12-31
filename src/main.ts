import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import morgan from 'morgan';
import { ValidationPipe, VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips out extra fields hackers might send
    forbidNonWhitelisted: true, // Throws error if extra fields are sent
  }));

  app.enableVersioning({
    type: VersioningType.URI, // URL-based versioning
    defaultVersion: '1',
  });
  // gives you concise, colored logs
  app.use(morgan('dev'));

  const config = new DocumentBuilder()
    .setTitle('FaceLook')
    .setDescription('The FaceLook API description')
    .setVersion('1.0')
    .addTag('shopping')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
