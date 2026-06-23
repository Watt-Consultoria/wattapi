import { z } from 'zod';

export const createPushSubscriptionSchema = z.object({
  endpoint: z.string().min(1),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export type CreatePushSubscriptionDto = z.infer<
  typeof createPushSubscriptionSchema
>;

export interface PushSubscriptionResponse {
  id: string;
  user_id: string;
  endpoint: string;
  created_at: string;
}
