import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const weeklyJobResultSchema = z
  .object({
    week_start: z.string(),
    users_checked: z.number(),
    violations_applied: z.number(),
  })
  .meta({
    example: {
      week_start: '2026-05-19',
      users_checked: 12,
      violations_applied: 3,
    },
  });

export class WeeklyJobResultDto extends createZodDto(weeklyJobResultSchema) {}

export type WeeklyJobResult = z.infer<typeof weeklyJobResultSchema>;

export const dailyJobResultSchema = z
  .object({
    notifications_created: z.number(),
  })
  .meta({ example: { notifications_created: 5 } });

export class DailyJobResultDto extends createZodDto(dailyJobResultSchema) {}

export type DailyJobResult = z.infer<typeof dailyJobResultSchema>;
