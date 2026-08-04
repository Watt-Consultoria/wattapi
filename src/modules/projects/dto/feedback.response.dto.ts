import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const projectFeedbackResponseSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    consultor_id: z.string(),
    answers: z.record(z.string(), z.unknown()),
    submitted_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      project_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      consultor_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      answers: { satisfacao: 'boa', nota: 9 },
      submitted_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class ProjectFeedbackResponseDto extends createZodDto(
  projectFeedbackResponseSchema,
) {}

export type ProjectFeedbackResponse = z.infer<
  typeof projectFeedbackResponseSchema
>;

export const pendingFeedbacksResponseSchema = z
  .object({
    pending_feedbacks: z.array(z.string()),
  })
  .meta({
    example: {
      pending_feedbacks: [
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      ],
    },
  });

export class PendingFeedbacksResponseDto extends createZodDto(
  pendingFeedbacksResponseSchema,
) {}

export type PendingFeedbacksResponse = z.infer<
  typeof pendingFeedbacksResponseSchema
>;
