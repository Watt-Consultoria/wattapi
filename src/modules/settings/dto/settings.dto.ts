import { z } from 'zod';

export interface AppSettings {
  min_week_hours: number;
}

export const updateSettingsSchema = z.object({
  min_week_hours: z.number().int().positive().optional(),
});

export type UpdateSettingsData = z.infer<typeof updateSettingsSchema>;
