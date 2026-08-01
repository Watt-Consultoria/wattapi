import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const appSettingsSchema = z
  .object({
    min_week_hours: z.number(),
    min_availability_hours: z.number(),
  })
  .meta({
    example: { min_week_hours: 40, min_availability_hours: 0 },
  });

export class AppSettingsDto extends createZodDto(appSettingsSchema) {}

export type AppSettings = z.infer<typeof appSettingsSchema>;
