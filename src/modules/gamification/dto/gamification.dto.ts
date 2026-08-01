import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ─── Cycles ──────────────────────────────────────────────────────────────────

export const createCycleSchema = z
  .object({
    name: z.string().min(1),
  })
  .meta({ example: { name: '1º Semestre 2026' } });

export class CreateCycleDto extends createZodDto(createCycleSchema) {}

export interface CycleRow {
  id: string;
  name: string;
  started_at: Date;
  ended_at: Date | null;
  created_by: string;
  created_at: Date;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTaskSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    points: z.number().int().positive(),
  })
  .meta({
    example: {
      title: 'Participar de vídeo do marketing',
      description: 'Aparecer em um vídeo oficial da Watt Consultoria',
      points: 50,
    },
  });

export class CreateTaskDto extends createZodDto(createTaskSchema) {}

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    points: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .meta({ example: { points: 75, is_active: false } });

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

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

// ─── Submissions ─────────────────────────────────────────────────────────────

export const createSubmissionSchema = z
  .object({
    task_id: z
      .string()
      .regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
        'Invalid UUID',
      ),
    description: z.string().min(1),
    file_path: z.string().min(1),
  })
  .meta({
    example: {
      task_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      description: 'Participei do vídeo em 04/06/2026',
      file_path: 'proofs/uuid-do-usuario/nome-do-arquivo.pdf',
    },
  });

export class CreateSubmissionDto extends createZodDto(createSubmissionSchema) {}

export const reviewSubmissionSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    rejection_reason: z.string().optional(),
  })
  .meta({
    example: {
      status: 'approved',
      rejection_reason: 'opcional — apenas para rejections',
    },
  });

export class ReviewSubmissionDto extends createZodDto(reviewSubmissionSchema) {}

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
