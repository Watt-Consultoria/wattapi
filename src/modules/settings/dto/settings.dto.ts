import { z } from 'zod';

export interface AppSettings {
  min_week_hours: number;
  min_availability_hours: number;
}

export const updateSettingsSchema = z.object({
  min_week_hours: z.number().int().positive().max(98).optional(),
  min_availability_hours: z.number().int().min(0).max(98).optional(),
});

export type UpdateSettingsData = z.infer<typeof updateSettingsSchema>;
