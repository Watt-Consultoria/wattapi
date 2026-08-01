import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ─── Cycles ──────────────────────────────────────────────────────────────────

export const cycleResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    started_at: z.string(),
    ended_at: z.string().nullable(),
    created_by: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: '1º Semestre 2026',
      started_at: '2026-06-04T00:00:00Z',
      ended_at: null,
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-06-04T00:00:00Z',
    },
  });

export class CycleResponseDto extends createZodDto(cycleResponseSchema) {}

export type CycleResponse = z.infer<typeof cycleResponseSchema>;

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const taskResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    points: z.number(),
    is_active: z.boolean(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Participar de vídeo do marketing',
      description: 'Aparecer em um vídeo oficial da Watt Consultoria',
      points: 50,
      is_active: true,
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
    },
  });

export class TaskResponseDto extends createZodDto(taskResponseSchema) {}

export type TaskResponse = z.infer<typeof taskResponseSchema>;

// ─── Submissions ─────────────────────────────────────────────────────────────

export const submissionResponseSchema = z
  .object({
    id: z.string(),
    task_id: z.string(),
    user_id: z.string(),
    house_id: z.string(),
    cycle_id: z.string(),
    description: z.string(),
    file_url: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    rejection_reason: z.string().nullable(),
    reviewed_by: z.string().nullable(),
    reviewed_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      task_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      house_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      cycle_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      description: 'Participei do vídeo em 04/06/2026',
      file_url: 'https://storage.example.com/gamification-proofs/signed-url',
      status: 'pending',
      rejection_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: '2026-06-04T00:00:00.000Z',
      updated_at: '2026-06-04T00:00:00.000Z',
    },
  });

export class SubmissionResponseDto extends createZodDto(
  submissionResponseSchema,
) {}

export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const leaderboardEntrySchema = z
  .object({
    house_id: z.string(),
    house_name: z.string(),
    total_points: z.number(),
  })
  .meta({
    example: {
      house_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      house_name: 'Nexus',
      total_points: 210,
    },
  });

export class LeaderboardEntryDto extends createZodDto(leaderboardEntrySchema) {}

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const podiumEntrySchema = z
  .object({
    user_id: z.string(),
    user_name: z.string(),
    points_contributed: z.number(),
    approved_count: z.number(),
  })
  .meta({
    example: {
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_name: 'Danilo Silva',
      points_contributed: 150,
      approved_count: 3,
    },
  });

export class PodiumEntryDto extends createZodDto(podiumEntrySchema) {}

export type PodiumEntry = z.infer<typeof podiumEntrySchema>;
