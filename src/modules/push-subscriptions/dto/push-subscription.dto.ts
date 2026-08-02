import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPushSubscriptionSchema = z
  .object({
    endpoint: z.string().min(1),
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  })
  .meta({
    example: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  });

export class CreatePushSubscriptionDto extends createZodDto(
  createPushSubscriptionSchema,
) {}
