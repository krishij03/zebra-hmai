/**
 * Logger service using Pino
 */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { pino, Logger as PinoLogger } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: PinoLogger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });
  }

  log(message: string, context?: string) {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.trace({ context }, message);
  }

  /**
   * Get the raw Pino logger instance
   */
  getPinoLogger(): PinoLogger {
    return this.logger;
  }
}

