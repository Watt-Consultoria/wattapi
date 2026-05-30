import { z } from 'zod';

export const createNotificationSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  target: z
    .object({
      sector: z.string().optional(),
      role: z
        .enum(['consultor', 'gerente', 'diretor', 'assessor', 'presidente'])
        .optional(),
    })
    .default({}),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  origin: 'automatic' | 'directed';
  sent_at: Date;
  created_by: string | null;
  deleted_at: Date | null;
  created_at: Date;
}

export interface NotificationResponse {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  origin: 'automatic' | 'directed';
  sent_at: string;
  created_by: string | null;
  created_at: string;
}
