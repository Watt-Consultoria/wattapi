import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const submissionFileResponseSchema = z
  .object({
    id: z.string(),
    deliverable_id: z.string(),
    name: z.string(),
    path: z.string().optional(),
    signed_url: z.string().optional(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      deliverable_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'relatorio.pdf',
      signed_url: 'https://storage.example.com/project-stage-files/signed-url',
    },
  });

export const submissionResponseSchema = z
  .object({
    id: z.string(),
    stage_id: z.string(),
    notes: z.string().nullable(),
    attempt: z.number(),
    submitted_by: z.string(),
    submitted_at: z.string(),
    files: z.array(submissionFileResponseSchema),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      stage_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      notes: 'Entrega concluída conforme solicitado',
      attempt: 1,
      submitted_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      submitted_at: '2026-01-01T00:00:00.000Z',
      files: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          deliverable_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'relatorio.pdf',
          signed_url:
            'https://storage.example.com/project-stage-files/signed-url',
        },
      ],
    },
  });

export class SubmissionResponseDto extends createZodDto(
  submissionResponseSchema,
) {}

export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
