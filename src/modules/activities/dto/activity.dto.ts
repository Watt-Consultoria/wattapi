import { createZodDto } from 'nestjs-zod';
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
  })
  .meta({
    example: {
      name: 'Prova de Sistemas Digitais',
      description: 'Prova da Segunda Unidade',
      date: '2026-05-29',
      time_start: '09:00',
      time_end: '10:00',
      priority: 'alta',
    },
  });

export class CreateActivityDto extends createZodDto(createActivitySchema) {}

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
  )
  .meta({
    example: {
      name: 'Novo nome',
      description: 'Nova descrição',
      date: '2026-06-01',
      time_start: '10:00',
      time_end: '11:30',
      priority: 'media',
    },
  });

export class UpdateActivityDto extends createZodDto(updateActivitySchema) {}

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

export interface ActivityFilters {
  date?: string;
  from?: string;
  to?: string;
  userId?: string;
}
