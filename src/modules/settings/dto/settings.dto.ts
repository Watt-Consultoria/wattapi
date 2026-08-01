import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateSettingsSchema = z
  .object({
    min_week_hours: z.number().int().positive().max(98).optional(),
    min_availability_hours: z.number().int().min(0).max(98).optional(),
  })
  .meta({
    example: { min_week_hours: 44, min_availability_hours: 10 },
  });

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}

export type UpdateSettingsData = z.infer<typeof updateSettingsSchema>;
