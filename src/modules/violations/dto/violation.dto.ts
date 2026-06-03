import { z } from 'zod';
import type { NormSeverity } from '../../norms/dto/norm.dto';

const uuid = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
    'Invalid UUID',
  );

export const createViolationSchema = z.object({
  user_id: uuid,
  norm_id: uuid,
  reason: z.string().optional(),
});

export type CreateViolationDto = z.infer<typeof createViolationSchema>;

export type ViolationStatus = 'active' | 'cancelled' | 'expired';

export interface ViolationRow {
  id: string;
  user_id: string;
  norm_id: string;
  applied_by: string;
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

export interface ViolationResponse {
  id: string;
  user_id: string;
  norm: {
    id: string;
    code: string;
    description: string;
    severity: NormSeverity;
    points: number;
  };
  reason: string | null;
  status: ViolationStatus;
  expires_at: string;
  cancelled_at: string | null;
  applied_at: string;
  created_at: string;
}

export interface ViolationResponseWithAppliedBy extends ViolationResponse {
  applied_by: string;
}

export interface ViolationSummary {
  score: number;
  active_leves: number;
  active_moderadas: number;
  active_graves: number;
  active_desligamentos: number;
  at_risk: boolean;
}

export interface MemberViolationsResponse {
  user_id: string;
  violations: ViolationResponse[];
  summary: ViolationSummary;
}

export interface MeViolationsResponse {
  violations: ViolationResponse[];
  summary: ViolationSummary;
}
