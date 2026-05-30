import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createActivitySchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time_start: z.string().regex(timeRegex),
    time_end: z.string().regex(timeRegex),
    priority: z.enum(['alta', 'media', 'baixa']),
  })
  .refine((d) => d.time_end > d.time_start, {
    message: 'time_end must be after time_start',
    path: ['time_end'],
  });

export const updateActivitySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    time_start: z.string().regex(timeRegex).optional(),
    time_end: z.string().regex(timeRegex).optional(),
    priority: z.enum(['alta', 'media', 'baixa']).optional(),
  })
  .refine(
    (d) => {
      if (d.time_start && d.time_end) return d.time_end > d.time_start;
      return true;
    },
    { message: 'time_end must be after time_start', path: ['time_end'] },
  );

export type CreateActivityDto = z.infer<typeof createActivitySchema>;
export type UpdateActivityDto = z.infer<typeof updateActivitySchema>;

export interface ActivityRow {
  id: string;
  user_id: string;
  user_name: string;
  name: string;
  description: string | null;
  date: Date;
  time_start: string;
  time_end: string;
  priority: 'alta' | 'media' | 'baixa';
  created_at: Date;
  updated_at: Date;
}

export interface ActivityResponse {
  id: string;
  user_id: string;
  user_name: string;
  name: string;
  description: string | null;
  date: string;
  time_start: string;
  time_end: string;
  priority: 'alta' | 'media' | 'baixa';
  created_at: string;
  updated_at: string;
}

export interface ActivityFilters {
  date?: string;
  from?: string;
  to?: string;
  userId?: string;
}
