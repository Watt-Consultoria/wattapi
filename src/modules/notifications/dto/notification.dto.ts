import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createNotificationSchema = z
  .object({
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
  })
  .meta({
    example: {
      title: 'Aviso importante',
      description: 'Texto opcional da notificação',
      target: { sector: 'comercial', role: 'diretor' },
    },
  });

export class CreateNotificationDto extends createZodDto(
  createNotificationSchema,
) {}

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
