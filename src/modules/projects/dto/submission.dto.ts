import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UUID_REGEX } from './project.dto';

const submissionFileSchema = z.object({
  deliverable_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
  path: z.string().min(1),
  name: z.string().min(1),
});

export const createSubmissionSchema = z
  .object({
    notes: z.string().optional(),
    files: z.array(submissionFileSchema),
  })
  .meta({
    example: {
      notes: 'Entrega concluída conforme solicitado',
      files: [
        {
          deliverable_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          path: 'stage-files/consultant-uuid/relatorio.pdf',
          name: 'relatorio.pdf',
        },
      ],
    },
  });

export class CreateSubmissionDto extends createZodDto(createSubmissionSchema) {}

export interface SubmissionRow {
  id: string;
  stage_id: string;
  notes: string | null;
  attempt: number;
  submitted_by: string;
  submitted_at: Date;
}

export interface SubmissionFileRow {
  id: string;
  submission_id: string;
  deliverable_id: string;
  path: string;
  name: string;
  created_at: Date;
}
