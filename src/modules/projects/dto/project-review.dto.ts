import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const projectReviewSchema = z
  .object({
    approved: z.boolean(),
    notes: z.string().min(1),
  })
  .meta({
    example: { approved: true, notes: 'Projeto aprovado' },
  });

export class ProjectReviewDto extends createZodDto(projectReviewSchema) {}

export interface ProjectReviewRow {
  id: string;
  project_id: string;
  round: number;
  approved: boolean;
  notes: string;
  reviewer_id: string;
  reviewed_at: Date;
}
