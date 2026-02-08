import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import morgan from 'morgan'; // Changed to '* as morgan' for better compatibility
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NestExpressApplication } from '@nestjs/platform-express'; // ✅ 1. Import this
import { join } from 'path'; // ✅ 2. Import this

async function bootstrap() {
  // ✅ 3. Add <NestExpressApplication> generic here
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- Firebase Setup ---
  // Ensure this file actually exists at this path relative to dist/src/main.js
  const serviceAccount = require('../firebase_service_account.json');

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

  app.use(morgan('dev'));

  // ✅ 4. Serve Static Assets (Profile Pictures)
  // This exposes http://localhost:3000/uploads/profiles/filename.jpg
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // --- Swagger Setup ---
  const config = new DocumentBuilder()
    .setTitle('FaceLook')
    .setDescription('The FaceLook API description')
    .setVersion('1.0')
    .addTag('shopping')
    .addBearerAuth() // Recommended: Add this if you use JWT in Swagger
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // --- Start Server ---
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();