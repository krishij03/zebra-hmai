/**
 * Zod Validation Pipe
 * Validates request bodies against Zod schemas
 */
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: error.errors,
      });
    }
  }
}


