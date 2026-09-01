import 'reflect-metadata';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { createFastifyAdapter } from './core/http/create-fastify-adapter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(),
  );
  const port = Number.parseInt(
    process.env.SIMULATOR_API_PORT ?? process.env.PORT ?? '8080',
    10,
  );

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
