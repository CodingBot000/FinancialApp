import 'reflect-metadata';

import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  const port = Number.parseInt(
    process.env.PLATFORM_API_PORT ?? process.env.PORT ?? '8080',
    10,
  );

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
