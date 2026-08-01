import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const clockInResponseSchema = z
  .object({
    id: z.string(),
    clocked_in_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      clocked_in_at: '2026-05-25T14:30:00.000Z',
    },
  });

export class ClockInResponseDto extends createZodDto(clockInResponseSchema) {}

export type ClockInResponse = z.infer<typeof clockInResponseSchema>;

export const clockOutValidResponseSchema = z
  .object({
    status: z.literal('valid'),
    id: z.string(),
    clocked_in_at: z.string(),
    clocked_out_at: z.string(),
    duration_minutes: z.number(),
  })
  .meta({
    example: {
      status: 'valid',
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      clocked_in_at: '2026-05-25T14:30:00.000Z',
      clocked_out_at: '2026-05-25T22:30:00.000Z',
      duration_minutes: 480,
    },
  });

// `createZodDto` cannot `extends` a top-level z.union() schema (the inferred
// union type is not a valid base-constructor return type for a class), so
// the two clock-out variants get their own DTO classes for Swagger instead
// of a single unioned one. `@ApiResponse` documents both via `oneOf` in the
// controller. The union schema/type below is still exported for runtime use.
export class ClockOutValidResponseDto extends createZodDto(
  clockOutValidResponseSchema,
) {}

export const clockOutAnnulledResponseSchema = z
  .object({
    status: z.literal('annulled'),
    reason: z.literal('exceeded_max_duration'),
    id: z.string(),
    clocked_in_at: z.string(),
    clocked_out_at: z.string(),
    duration_minutes: z.number(),
  })
  .meta({
    example: {
      status: 'annulled',
      reason: 'exceeded_max_duration',
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      clocked_in_at: '2026-05-25T14:30:00.000Z',
      clocked_out_at: '2026-05-26T01:30:00.000Z',
      duration_minutes: 660,
    },
  });

export class ClockOutAnnulledResponseDto extends createZodDto(
  clockOutAnnulledResponseSchema,
) {}

export const clockOutResponseSchema = z.union([
  clockOutValidResponseSchema,
  clockOutAnnulledResponseSchema,
]);

export type ClockOutValidResponse = z.infer<typeof clockOutValidResponseSchema>;
export type ClockOutAnnulledResponse = z.infer<
  typeof clockOutAnnulledResponseSchema
>;
export type ClockOutResponse = z.infer<typeof clockOutResponseSchema>;

const currentSessionNoneSchema = z
  .object({
    status: z.literal('none'),
  })
  .meta({ example: { status: 'none' } });

const currentSessionOpenSchema = z
  .object({
    status: z.literal('open'),
    clocked_in_at: z.string(),
    elapsed_minutes: z.number(),
  })
  .meta({
    example: {
      status: 'open',
      clocked_in_at: '2026-05-19T09:00:00.000Z',
      elapsed_minutes: 120,
    },
  });

const currentSessionInvalidSchema = z
  .object({
    status: z.literal('invalid'),
    reason: z.literal('exceeded_max_duration'),
    clocked_in_at: z.string(),
    elapsed_minutes: z.number(),
  })
  .meta({
    example: {
      status: 'invalid',
      reason: 'exceeded_max_duration',
      clocked_in_at: '2026-05-19T09:00:00.000Z',
      elapsed_minutes: 510,
    },
  });

export const currentSessionSchema = z.union([
  currentSessionNoneSchema,
  currentSessionOpenSchema,
  currentSessionInvalidSchema,
]);

export type CurrentSessionNone = z.infer<typeof currentSessionNoneSchema>;
export type CurrentSessionOpen = z.infer<typeof currentSessionOpenSchema>;
export type CurrentSessionInvalid = z.infer<typeof currentSessionInvalidSchema>;
export type CurrentSession = z.infer<typeof currentSessionSchema>;

export const validSessionSchema = z
  .object({
    id: z.string(),
    clocked_in_at: z.string(),
    clocked_out_at: z.string(),
    duration_minutes: z.number(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      clocked_in_at: '2026-05-19T09:00:00.000Z',
      clocked_out_at: '2026-05-19T17:00:00.000Z',
      duration_minutes: 480,
    },
  });

export type ValidSession = z.infer<typeof validSessionSchema>;

export const summaryResponseSchema = z
  .object({
    week_start: z.string(),
    week_end: z.string(),
    total_minutes: z.number(),
    min_hours_met: z.boolean(),
    valid_sessions: z.array(validSessionSchema),
    current_session: currentSessionSchema,
  })
  .meta({
    example: {
      week_start: '2026-05-19',
      week_end: '2026-05-25',
      total_minutes: 960,
      min_hours_met: false,
      valid_sessions: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          clocked_in_at: '2026-05-19T09:00:00.000Z',
          clocked_out_at: '2026-05-19T17:00:00.000Z',
          duration_minutes: 480,
        },
      ],
      current_session: { status: 'none' },
    },
  });

export class SummaryResponseDto extends createZodDto(summaryResponseSchema) {}

export type SummaryResponse = z.infer<typeof summaryResponseSchema>;

export const memberWeeklySummarySchema = z
  .object({
    user_id: z.string(),
    name: z.string(),
    total_minutes: z.number(),
    min_hours_met: z.boolean(),
  })
  .meta({
    example: {
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'João Silva',
      total_minutes: 480,
      min_hours_met: true,
    },
  });

export type MemberWeeklySummary = z.infer<typeof memberWeeklySummarySchema>;

export const timeEntriesListResponseSchema = z
  .object({
    week_start: z.string(),
    week_end: z.string(),
    min_week_hours: z.number(),
    members: z.array(memberWeeklySummarySchema),
  })
  .meta({
    example: {
      week_start: '2026-05-19',
      week_end: '2026-05-25',
      min_week_hours: 40,
      members: [
        {
          user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'João Silva',
          total_minutes: 480,
          min_hours_met: true,
        },
      ],
    },
  });

export class TimeEntriesListResponseDto extends createZodDto(
  timeEntriesListResponseSchema,
) {}

export type TimeEntriesListResponse = z.infer<
  typeof timeEntriesListResponseSchema
>;
