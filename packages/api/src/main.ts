/**
 * Bootstrap file for Zebra HMAI API v2
 * NestJS 11 + Fastify adapter + Pino logger
 */
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';

// Load .env file from packages/api directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Set CONFIG_PATH to absolute path if not already set
// When compiled: __dirname = packages/api/dist
// So ../../../config/Zconfig.json goes up to root, then to config/
if (!process.env.CONFIG_PATH) {
  process.env.CONFIG_PATH = resolve(__dirname, '../../../config/Zconfig.json');
} else if (!process.env.CONFIG_PATH.startsWith('/')) {
  // If relative path provided, resolve it from packages/api directory
  process.env.CONFIG_PATH = resolve(__dirname, '..', process.env.CONFIG_PATH);
}

// Set METRICS_CONFIG_PATH to absolute path if not already set
if (!process.env.METRICS_CONFIG_PATH) {
  process.env.METRICS_CONFIG_PATH = resolve(__dirname, '../../../src/metrics.json');
} else if (!process.env.METRICS_CONFIG_PATH.startsWith('/')) {
  process.env.METRICS_CONFIG_PATH = resolve(__dirname, '..', process.env.METRICS_CONFIG_PATH);
}

console.log(`[Zebra] CONFIG_PATH resolved to: ${process.env.CONFIG_PATH}`);
console.log(`[Zebra] METRICS_CONFIG_PATH resolved to: ${process.env.METRICS_CONFIG_PATH}`);

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

async function bootstrap() {
  // Pino logger configuration
  const pinoHttp = {
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          }
        : undefined,
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(req: any) {
        return {
          method: req.method,
          url: req.url,
          path: req.routerPath,
          parameters: req.params,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
          },
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  };

  // Create Fastify adapter with logger
  const fastifyAdapter = new FastifyAdapter({
    logger: pinoHttp,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    bodyLimit: 10485760, // 10MB
  });

  // Create NestJS application with Fastify
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    {
      bufferLogs: true,
      // Don't enable CORS here - we'll do it below with more options
    },
  );

  // Use Pino logger from Fastify
  app.useLogger(app.get(LoggerService));

  // Enable CORS with configuration
  // When credentials: true, origin cannot be wildcard '*'
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe with Zod
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '2',
    prefix: 'v',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI documentation
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Zebra HMAI API')
      .setDescription(
        'Zebra HMAI (Health Monitoring and Analytics Infrastructure) REST API for IBM z/OS mainframe performance metrics',
      )
      .setVersion('2.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /auth/login',
        },
        'JWT',
      )
      .addTag('Auth', 'Authentication and authorization')
      .addTag('RMF Monitor III', 'Real-time RMF Monitor III metrics')
      .addTag('RMF Post Processor', 'Historical RMF Post Processor data')
      .addTag('HMAI', 'Health Monitoring and Analytics Infrastructure')
      .addTag('HMRE', 'Health Monitoring Reporting Enhancements')
      .addTag('DCOL', 'Data Collection metrics')
      .addTag('Metrics', 'Prometheus metrics and configuration')
      .addTag('Config', 'Configuration management')
      .addTag('Health', 'Health and readiness checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Zebra HMAI API Docs',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    app.getHttpAdapter().get('/api/openapi.json', (req, res) => {
      res.type('application/json').send(document);
    });
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  // Listen on all network interfaces for containerized environments
  const port = Number.parseInt(process.env.PORT || '3090', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  const logger = app.get(LoggerService);
  logger.log(`🚀 Zebra HMAI API v2 is running on: http://${host}:${port}/api`, 'Bootstrap');
  logger.log(`📚 API Documentation: http://${host}:${port}/api/docs`, 'Bootstrap');
  logger.log(`🏥 Health Check: http://${host}:${port}/api/health`, 'Bootstrap');
  logger.log(`📊 Metrics: http://${host}:${port}/api/metrics`, 'Bootstrap');

  // Log environment
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'Bootstrap');
  logger.log(`Log Level: ${pinoHttp.level}`, 'Bootstrap');
  
  // Log Redis status
  if (process.env.DISABLE_REDIS === 'true') {
    logger.warn('⚠️  Redis/BullMQ DISABLED - HMAI ingestion features will not be available', 'Bootstrap');
  } else {
    logger.log(`✓ Redis enabled on ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`, 'Bootstrap');
  }
}

// Start application
bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

