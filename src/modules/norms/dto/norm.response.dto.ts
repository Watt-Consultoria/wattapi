import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { normSeverities } from './norm.dto';

export const normResponseSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    severity: z.enum(normSeverities),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      code: 'AN01',
      description:
        'Atraso superior a 15 minutos em reunião agendada sem aviso prévio.',
      severity: 'leve',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class NormResponseDto extends createZodDto(normResponseSchema) {}

export type NormResponse = z.infer<typeof normResponseSchema>;
