import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const activityResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    user_name: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    date: z.string(),
    time_start: z.string(),
    time_end: z.string(),
    priority: z.enum(['alta', 'media', 'baixa']),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_name: 'João Silva',
      name: 'Reunião de alinhamento',
      description: 'Alinhamento semanal do time',
      date: '2026-05-29',
      time_start: '09:00',
      time_end: '10:00',
      priority: 'alta',
      created_at: '2026-05-29T12:00:00.000Z',
      updated_at: '2026-05-29T12:00:00.000Z',
    },
  });

export class ActivityResponseDto extends createZodDto(activityResponseSchema) {}

export type ActivityResponse = z.infer<typeof activityResponseSchema>;
