import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const submitFeedbackSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
  })
  .refine((data) => Object.keys(data.answers).length > 0, {
    message: 'answers não pode ser vazio',
    path: ['answers'],
  })
  .meta({
    example: { answers: { satisfacao: 'boa', nota: 9 } },
  });

export class SubmitFeedbackDto extends createZodDto(submitFeedbackSchema) {}

export interface ProjectFeedbackRow {
  id: string;
  project_id: string;
  consultor_id: string;
  answers: Record<string, unknown>;
  submitted_at: Date;
}
