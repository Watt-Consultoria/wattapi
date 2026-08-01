import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import type { NormSeverity } from '../../norms/dto/norm.dto';

const uuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
    'Invalid UUID',
  );

export const createViolationSchema = z
  .object({
    user_id: uuid,
    norm_id: uuid,
    reason: z.string().optional(),
  })
  .meta({
    example: {
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      norm_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      reason: 'Justificativa opcional',
    },
  });

export class CreateViolationDto extends createZodDto(createViolationSchema) {}

export type ViolationStatus = 'active' | 'cancelled' | 'expired';

export interface ViolationRow {
  id: string;
  user_id: string;
  norm_id: string;
  applied_by: string | null;
  source: 'manual' | 'automatic';
  reason: string | null;
  expires_at: Date;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  applied_at: Date;
  created_at: Date;
  norm_code: string;
  norm_description: string;
  norm_severity: NormSeverity;
}
