import { z } from 'zod';

// ─── Cycles ──────────────────────────────────────────────────────────────────

export const createCycleSchema = z.object({
  name: z.string().min(1),
});

export type CreateCycleDto = z.infer<typeof createCycleSchema>;

export interface CycleRow {
  id: string;
  name: string;
  started_at: Date;
  ended_at: Date | null;
  created_by: string;
  created_at: Date;
}

export interface CycleResponse {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  created_by: string;
  created_at: string;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  points: z.number().int().positive(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  points: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  points: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  points: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export const createSubmissionSchema = z.object({
  task_id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
      'Invalid UUID',
    ),
  description: z.string().min(1),
  file_path: z.string().min(1),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
});

export type CreateSubmissionDto = z.infer<typeof createSubmissionSchema>;
export type ReviewSubmissionDto = z.infer<typeof reviewSubmissionSchema>;

export interface SubmissionRow {
  id: string;
  task_id: string;
  user_id: string;
  house_id: string;
  cycle_id: string;
  description: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionResponse {
  id: string;
  task_id: string;
  user_id: string;
  house_id: string;
  cycle_id: string;
  description: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  house_id: string;
  house_name: string;
  total_points: number;
}

export interface PodiumEntry {
  user_id: string;
  user_name: string;
  points_contributed: number;
  approved_count: number;
}
