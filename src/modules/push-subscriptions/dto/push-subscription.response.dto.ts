import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const pushSubscriptionResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    endpoint: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class PushSubscriptionResponseDto extends createZodDto(
  pushSubscriptionResponseSchema,
) {}

export type PushSubscriptionResponse = z.infer<
  typeof pushSubscriptionResponseSchema
>;
