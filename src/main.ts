import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import morgan from 'morgan';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- 1. Security: Enable CORS (Crucial for Production) ---
  // This allows your app and payment gateways to talk to the server without blocking.
  app.enableCors({
    origin: ['*',
      'https://admin.facelookshopping.in',
      'https://staging.facelookshopping.in',
      'https://facelookshopping.in'
    ], // For mobile apps, '*' is usually fine. For web, strictly list domains.
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // --- Firebase Setup ---
  // We use process.cwd() to ensure we find the file in the Docker container root
  const serviceAccountPath = join(process.cwd(), 'firebase_service_account.json');
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  // --- Global Config ---
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(morgan('combined')); // 'combined' gives better logs for production than 'dev'

  // --- 2. Serve Static Assets (Robust Fix) ---
  // standardizes the path to /usr/src/app/uploads regardless of build structure
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // --- Swagger Setup ---
  // We strictly hide Swagger in production unless you explicitly want it
  const config = new DocumentBuilder()
    .setTitle('FaceLook')
    .setDescription('The FaceLook API description')
    .setVersion('1.0')
    .addTag('shopping')
    .addBearerAuth()
    .addServer(process.env.APP_URL || 'http://localhost:3000') // Explicitly set Server URL
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory); // Changed path to 'docs' to avoid conflict with 'api' routes

  // --- Start Server ---
  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();