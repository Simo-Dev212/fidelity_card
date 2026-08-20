import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import fastifyStatic from '@fastify/static';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.register(fastifyStatic as any, {
    root: join(process.cwd(), 'public'),
    prefix: '/public/',
    decorateReply: false,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Loyalty Wallet API')
    .setDescription(
      'Multi-tenant Digital Loyalty Wallet Platform – Google Wallet first, Apple ready',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('join', 'Public NFC join flow')
    .addTag('auth')
    .addTag('memberships')
    .addTag('loyalty')
    .addTag('webhooks')
    .addTag('admin')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Loyalty Wallet running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`📱 PWA: http://localhost:${port}/app`);
}

bootstrap();
