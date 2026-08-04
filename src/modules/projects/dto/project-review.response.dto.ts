import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const projectReviewResponseSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    round: z.number(),
    approved: z.boolean(),
    notes: z.string(),
    reviewer_id: z.string(),
    reviewed_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      project_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      round: 1,
      approved: true,
      notes: 'Projeto aprovado',
      reviewer_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      reviewed_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class ProjectReviewResponseDto extends createZodDto(
  projectReviewResponseSchema,
) {}

export type ProjectReviewResponse = z.infer<typeof projectReviewResponseSchema>;
