import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const stageResponseSchema = z
  .object({
    id: z.string(),
    selection_process_id: z.string(),
    name: z.string(),
    position: z.number(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Entrevista',
      position: 1,
      created_at: '2026-02-15T00:00:00.000Z',
    },
  });

export class StageResponseDto extends createZodDto(stageResponseSchema) {}

export type StageResponse = z.infer<typeof stageResponseSchema>;
