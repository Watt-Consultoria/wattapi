import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const normSeverities = [
  'leve',
  'moderada',
  'grave',
  'desligamento',
] as const;
export type NormSeverity = (typeof normSeverities)[number];

export const createNormSchema = z
  .object({
    code: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(normSeverities),
  })
  .meta({
    example: {
      code: 'AN32',
      description: 'Descrição da nova norma',
      severity: 'leve',
    },
  });

export class CreateNormDto extends createZodDto(createNormSchema) {}

export const updateNormSchema = z
  .object({
    description: z.string().min(1).optional(),
    severity: z.enum(normSeverities).optional(),
  })
  .meta({
    example: { description: 'Nova descrição', severity: 'moderada' },
  });

export class UpdateNormDto extends createZodDto(updateNormSchema) {}

export interface NormRow {
  id: string;
  code: string;
  description: string;
  severity: NormSeverity;
  created_at: Date;
  updated_at: Date;
}
