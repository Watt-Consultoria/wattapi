import { z } from 'zod';

export const SHIRT_SIZES = ['P', 'M', 'G', 'GG', 'XG'] as const;
export const APPLICATION_STATUSES = [
  'pending',
  'approved',
  'reproved',
] as const;
export const CANDIDATE_STATUSES = ['active', 'eliminated', 'approved'] as const;

const FILE_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(resume|transcript|photo)\.[a-zA-Z]{2,4}$/;

export const createProcessSchema = z
  .object({
    title: z.string().min(1),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: 'ends_at must be after starts_at',
    path: ['ends_at'],
  });

export const updateProcessSchema = z
  .object({
    title: z.string().min(1).optional(),
    starts_at: z.string().datetime({ offset: true }).optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(
    (d) =>
      d.starts_at === undefined ||
      d.ends_at === undefined ||
      new Date(d.ends_at) > new Date(d.starts_at),
    { message: 'ends_at must be after starts_at', path: ['ends_at'] },
  );

export const createApplicationSchema = z.object({
  name: z.string().min(1),
  course: z.string().min(1),
  period: z.number().int().positive(),
  phone: z.string().min(1),
  email: z.string().email(),
  instagram: z.string().min(1),
  how_heard: z.string().min(1),
  motivation: z.string().min(1),
  why_watt: z.string().min(1),
  shirt_size: z.enum(SHIRT_SIZES),
  resume_path: z.string().regex(FILE_PATH_REGEX, 'Invalid resume path format'),
  transcript_path: z
    .string()
    .regex(FILE_PATH_REGEX, 'Invalid transcript path format'),
  photo_path: z.string().regex(FILE_PATH_REGEX, 'Invalid photo path format'),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

export const createStageSchema = z.object({
  selection_process_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
  name: z.string().min(1),
  position: z.number().int().positive(),
  shift: z.boolean().optional(),
});

export const updateStageSchema = z
  .object({
    name: z.string().min(1).optional(),
    position: z.number().int().positive().optional(),
  })
  .refine((d) => d.name !== undefined || d.position !== undefined, {
    message: 'At least one of name or position must be provided',
  });

export const updateCandidateStatusSchema = z.object({
  status: z.enum(['approved', 'reproved'] as const),
});

export type CreateProcessDto = z.infer<typeof createProcessSchema>;
export type UpdateProcessDto = z.infer<typeof updateProcessSchema>;
export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusDto = z.infer<
  typeof updateApplicationStatusSchema
>;
export type CreateStageDto = z.infer<typeof createStageSchema>;
export type UpdateStageDto = z.infer<typeof updateStageSchema>;
export type UpdateCandidateStatusDto = z.infer<
  typeof updateCandidateStatusSchema
>;

export interface SelectionProcessRow {
  id: string;
  title: string;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
}

export interface ApplicationRow {
  id: string;
  selection_process_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  instagram: string;
  how_heard: string;
  motivation: string;
  why_watt: string;
  shirt_size: (typeof SHIRT_SIZES)[number];
  resume_path: string;
  transcript_path: string;
  photo_path: string;
  status: (typeof APPLICATION_STATUSES)[number];
  created_at: Date;
}

export interface StageRow {
  id: string;
  selection_process_id: string;
  name: string;
  position: number;
  created_at: Date;
}

export interface CandidateRow {
  id: string;
  application_id: string;
  selection_process_id: string;
  current_stage_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  photo_path: string;
  shirt_size: string;
  status: (typeof CANDIDATE_STATUSES)[number];
  created_at: Date;
}

export interface SelectionProcessResponse {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export interface ApplicationResponse {
  id: string;
  selection_process_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  instagram: string;
  how_heard: string;
  motivation: string;
  why_watt: string;
  shirt_size: string;
  status: string;
  resume_signed_url: string;
  transcript_signed_url: string;
  photo_signed_url: string;
  created_at: string;
}

export interface ApplicationCreatedResponse {
  id: string;
  created_at: string;
}

export interface StageResponse {
  id: string;
  selection_process_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface CandidateResponse {
  id: string;
  application_id: string;
  selection_process_id: string;
  current_stage_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  photo_signed_url: string;
  shirt_size: string;
  status: string;
  created_at: string;
}
