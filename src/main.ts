import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import morgan from 'morgan';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import session from 'express-session';

const uploadDir = join(process.cwd(), 'uploads');
const tempDir = join(uploadDir, 'temp');

// Ensure both exist
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// 2. Tell the system to use this folder for temporary files
process.env.TMPDIR = tempDir;
process.env.TEMP = tempDir;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    session({
      secret: 'my-super-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: false }, // Set secure: true in production (HTTPS)
    }),
  );

  // --- 1. Security: Enable CORS ---
  app.enableCors({
    origin: [
      'https://admin.facelookshopping.in',
      'https://staging.facelookshopping.in',
      'https://facelookshopping.in',
      'http://localhost:3000',
      '*'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // --- 2. Firebase Dynamic Setup ---
  const env = process.env.NODE_ENV || 'development';

  // Select file based on environment
  const serviceAccountFileName = env === 'production'
    ? 'firebase-service-account-production.json'
    : 'firebase-service-account-staging.json';

  const serviceAccountPath = join(process.cwd(), serviceAccountFileName);

  console.log(`🔥 Loading Firebase Config from: ${serviceAccountPath}`);

  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin Initialized Successfully');
    }
  } else {
    console.error(`❌ CRITICAL ERROR: Firebase config file NOT FOUND at: ${serviceAccountPath}`);
  }

  // --- Global Config ---
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.use(morgan('combined'));

  // --- 3. Serve Static Assets ---
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // --- Swagger Setup ---
  const config = new DocumentBuilder()
    .setTitle('FaceLook')
    .setDescription('The FaceLook API description')
    .setVersion('1.0')
    .addTag('shopping')
    .addBearerAuth()
    .addServer(process.env.APP_URL || 'http://localhost:3000')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  // --- Start Server ---
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
  console.log(`🌍 Environment: ${env}`);
}
bootstrap();