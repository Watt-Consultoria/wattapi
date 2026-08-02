import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const candidateResponseSchema = z
  .object({
    id: z.string(),
    application_id: z.string(),
    selection_process_id: z.string(),
    current_stage_id: z.string(),
    name: z.string(),
    course: z.string(),
    period: z.number(),
    phone: z.string(),
    email: z.string(),
    photo_signed_url: z.string(),
    shirt_size: z.string(),
    status: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      application_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      current_stage_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'João Silva',
      course: 'Engenharia',
      period: 3,
      phone: '11999990000',
      email: 'joao@example.com',
      photo_signed_url:
        'https://storage.example.com/selection-process-files/signed-url',
      shirt_size: 'M',
      status: 'active',
      created_at: '2026-03-15T00:00:00.000Z',
    },
  });

export class CandidateResponseDto extends createZodDto(
  candidateResponseSchema,
) {}

export type CandidateResponse = z.infer<typeof candidateResponseSchema>;
