import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const notificationResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    origin: z.enum(['automatic', 'directed']),
    sent_at: z.string(),
    created_by: z.string().nullable(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Atividade agendada para hoje: Reunião de alinhamento',
      description: 'Alinhamento semanal do time',
      origin: 'automatic',
      sent_at: '2026-05-30T03:00:00.000Z',
      created_by: null,
      created_at: '2026-05-30T03:00:00.000Z',
    },
  });

export class NotificationResponseDto extends createZodDto(
  notificationResponseSchema,
) {}

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
