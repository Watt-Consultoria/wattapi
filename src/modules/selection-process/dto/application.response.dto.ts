import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const applicationResponseSchema = z
  .object({
    id: z.string(),
    selection_process_id: z.string(),
    name: z.string(),
    course: z.string(),
    period: z.number(),
    phone: z.string(),
    email: z.string(),
    instagram: z.string(),
    how_heard: z.string(),
    motivation: z.string(),
    why_watt: z.string(),
    shirt_size: z.string(),
    status: z.string(),
    resume_signed_url: z.string(),
    transcript_signed_url: z.string(),
    photo_signed_url: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'João da Silva',
      course: 'Engenharia de Software',
      period: 5,
      phone: '11999990000',
      email: 'joao@example.com',
      instagram: '@joaosilva',
      how_heard: 'Indicação de amigo',
      motivation: 'Quero aprender e crescer profissionalmente',
      why_watt: 'A Watt tem projetos alinhados com meus valores',
      shirt_size: 'M',
      status: 'pending',
      resume_signed_url:
        'https://storage.example.com/selection-process-files/signed-url',
      transcript_signed_url:
        'https://storage.example.com/selection-process-files/signed-url',
      photo_signed_url:
        'https://storage.example.com/selection-process-files/signed-url',
      created_at: '2026-03-10T14:00:00.000Z',
    },
  });

export class ApplicationResponseDto extends createZodDto(
  applicationResponseSchema,
) {}

export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;

export const applicationCreatedResponseSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-03-10T14:00:00.000Z',
    },
  });

export class ApplicationCreatedResponseDto extends createZodDto(
  applicationCreatedResponseSchema,
) {}

export type ApplicationCreatedResponse = z.infer<
  typeof applicationCreatedResponseSchema
>;
