import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const stageReviewResponseSchema = z
  .object({
    id: z.string(),
    submission_id: z.string(),
    approved: z.boolean(),
    notes: z.string().nullable(),
    new_delivery_date: z.string().nullable(),
    reviewed_by: z.string(),
    reviewed_at: z.string(),
    rework_deliverable_ids: z.array(z.string()).optional(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      submission_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      approved: false,
      notes: 'Faltou anexar a planilha de custos',
      new_delivery_date: '2026-12-20',
      reviewed_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      reviewed_at: '2026-01-01T00:00:00.000Z',
      rework_deliverable_ids: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    },
  });

export class StageReviewResponseDto extends createZodDto(
  stageReviewResponseSchema,
) {}

export type StageReviewResponse = z.infer<typeof stageReviewResponseSchema>;
