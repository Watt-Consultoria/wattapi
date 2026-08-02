import {
  BadRequestException,
  type PipeTransform,
  type Type,
} from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import type { ZodError } from 'zod';

// Preserves the pre-migration 400 error shape (`result.error.flatten()` +
// `BadRequestException`) so existing API consumers see no contract change.
export const ZodValidationPipe: Type<PipeTransform> = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestException((error as ZodError).flatten()),
});
