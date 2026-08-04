import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UUID_REGEX } from './project.dto';

export const createStageReviewSchema = z
  .object({
    approved: z.boolean(),
    notes: z.string().optional(),
    new_delivery_date: z.string().min(1).optional(),
    deliverable_ids: z
      .array(z.string().regex(UUID_REGEX, 'Invalid UUID'))
      .optional(),
  })
  .refine((data) => data.approved || !!data.new_delivery_date, {
    message: 'new_delivery_date é obrigatório ao reprovar a submissão',
    path: ['new_delivery_date'],
  })
  .refine((data) => data.approved || (data.deliverable_ids?.length ?? 0) > 0, {
    message: 'deliverable_ids é obrigatório ao reprovar a submissão',
    path: ['deliverable_ids'],
  })
  .meta({
    example: {
      approved: false,
      notes: 'Faltou anexar a planilha de custos',
      new_delivery_date: '2026-12-20',
      deliverable_ids: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    },
  });

export class CreateStageReviewDto extends createZodDto(
  createStageReviewSchema,
) {}

export interface StageReviewRow {
  id: string;
  submission_id: string;
  approved: boolean;
  notes: string | null;
  new_delivery_date: Date | string | null;
  reviewed_by: string;
  reviewed_at: Date;
}
