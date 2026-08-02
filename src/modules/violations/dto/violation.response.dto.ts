import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { normSeverities } from '../../norms/dto/norm.dto';

export const violationNormResponseSchema = z
  .object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    severity: z.enum(normSeverities),
    points: z.number(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      code: 'AN01',
      description:
        'Atraso superior a 15 minutos em reunião agendada sem aviso prévio.',
      severity: 'leve',
      points: 1,
    },
  });

export const violationResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    norm: violationNormResponseSchema,
    source: z.enum(['manual', 'automatic']),
    reason: z.string().nullable(),
    status: z.enum(['active', 'cancelled', 'expired']),
    expires_at: z.string(),
    cancelled_at: z.string().nullable(),
    applied_at: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      norm: {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        code: 'AN01',
        description:
          'Atraso superior a 15 minutos em reunião agendada sem aviso prévio.',
        severity: 'leve',
        points: 1,
      },
      source: 'manual',
      reason: null,
      status: 'active',
      expires_at: '2027-06-02T00:00:00Z',
      cancelled_at: null,
      applied_at: '2026-06-02T00:00:00Z',
      created_at: '2026-06-02T00:00:00.000Z',
    },
  });

export class ViolationResponseDto extends createZodDto(
  violationResponseSchema,
) {}

export const violationResponseWithAppliedBySchema = violationResponseSchema
  .extend({
    applied_by: z.string().nullable(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      norm: {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        code: 'AN01',
        description:
          'Atraso superior a 15 minutos em reunião agendada sem aviso prévio.',
        severity: 'leve',
        points: 1,
      },
      source: 'manual',
      reason: null,
      status: 'active',
      expires_at: '2027-06-02T00:00:00Z',
      cancelled_at: null,
      applied_at: '2026-06-02T00:00:00Z',
      applied_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-06-02T00:00:00.000Z',
    },
  });

export class ViolationResponseWithAppliedByDto extends createZodDto(
  violationResponseWithAppliedBySchema,
) {}

export const violationSummaryResponseSchema = z
  .object({
    score: z.number(),
    active_leves: z.number(),
    active_moderadas: z.number(),
    active_graves: z.number(),
    active_desligamentos: z.number(),
    at_risk: z.boolean(),
  })
  .meta({
    example: {
      score: 1,
      active_leves: 1,
      active_moderadas: 0,
      active_graves: 0,
      active_desligamentos: 0,
      at_risk: false,
    },
  });

export class ViolationSummaryResponseDto extends createZodDto(
  violationSummaryResponseSchema,
) {}

const exampleViolation = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  norm: {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    code: 'AN01',
    description:
      'Atraso superior a 15 minutos em reunião agendada sem aviso prévio.',
    severity: 'leve',
    points: 1,
  },
  source: 'manual',
  reason: null,
  status: 'active',
  expires_at: '2027-06-02T00:00:00Z',
  cancelled_at: null,
  applied_at: '2026-06-02T00:00:00Z',
  created_at: '2026-06-02T00:00:00.000Z',
};

const exampleSummary = {
  score: 1,
  active_leves: 1,
  active_moderadas: 0,
  active_graves: 0,
  active_desligamentos: 0,
  at_risk: false,
};

export const memberViolationsResponseSchema = z
  .object({
    user_id: z.string(),
    violations: z.array(violationResponseSchema),
    summary: violationSummaryResponseSchema,
  })
  .meta({
    example: {
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      violations: [exampleViolation],
      summary: exampleSummary,
    },
  });

export class MemberViolationsResponseDto extends createZodDto(
  memberViolationsResponseSchema,
) {}

export const meViolationsResponseSchema = z
  .object({
    violations: z.array(violationResponseSchema),
    summary: violationSummaryResponseSchema,
  })
  .meta({
    example: {
      violations: [exampleViolation],
      summary: exampleSummary,
    },
  });

export class MeViolationsResponseDto extends createZodDto(
  meViolationsResponseSchema,
) {}

export type ViolationResponse = z.infer<typeof violationResponseSchema>;
export type ViolationResponseWithAppliedBy = z.infer<
  typeof violationResponseWithAppliedBySchema
>;
export type ViolationSummary = z.infer<typeof violationSummaryResponseSchema>;
export type MemberViolationsResponse = z.infer<
  typeof memberViolationsResponseSchema
>;
export type MeViolationsResponse = z.infer<typeof meViolationsResponseSchema>;
