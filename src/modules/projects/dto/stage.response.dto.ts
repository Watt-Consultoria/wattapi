import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROJECT_STAGE_STATUSES } from './stage.dto';

export const deliverableResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Relatório',
      description: 'Relatório de diagnóstico',
    },
  });

export class DeliverableResponseDto extends createZodDto(
  deliverableResponseSchema,
) {}

export const stageResponseSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    delivery_date: z.string(),
    deadline_date: z.string(),
    name: z.string(),
    description: z.string(),
    position: z.number(),
    consultant_id: z.string(),
    status: z.enum(PROJECT_STAGE_STATUSES),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    deliverables: z.array(deliverableResponseSchema),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      project_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      delivery_date: '2026-12-01',
      deadline_date: '2026-12-15',
      name: 'Diagnóstico Técnico',
      description: 'Levantamento técnico inicial',
      position: 1,
      consultant_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      status: 'pendente',
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      deliverables: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Relatório',
          description: 'Relatório de diagnóstico',
        },
      ],
    },
  });

export class StageResponseDto extends createZodDto(stageResponseSchema) {}

export type StageResponse = z.infer<typeof stageResponseSchema>;
