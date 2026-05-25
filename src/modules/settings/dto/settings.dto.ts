import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppSettingsSchema {
  @ApiProperty({
    example: 40,
    description: 'Mínimo de horas semanais exigidas da equipe',
  })
  min_week_hours: number;
}

export class UpdateSettingsBody {
  @ApiPropertyOptional({
    example: 40,
    description: 'Mínimo de horas semanais (inteiro positivo)',
    minimum: 1,
  })
  min_week_hours?: number;
}

export interface AppSettings {
  min_week_hours: number;
}

export const updateSettingsSchema = z.object({
  min_week_hours: z.number().int().positive().optional(),
});

export type UpdateSettingsData = z.infer<typeof updateSettingsSchema>;
