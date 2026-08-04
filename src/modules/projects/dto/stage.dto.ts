import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UUID_REGEX } from './project.dto';

export const PROJECT_STAGE_STATUSES = [
  'pendente',
  'em_revisao',
  'concluida',
] as const;

const deliverableSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const createStageSchema = z
  .object({
    delivery_date: z.string().min(1),
    deadline_date: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    position: z.number().int().positive(),
    consultant_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    deliverables: z.array(deliverableSchema).min(1),
  })
  .meta({
    example: {
      delivery_date: '2026-12-01',
      deadline_date: '2026-12-15',
      name: 'Diagnóstico Técnico',
      description: 'Levantamento técnico inicial',
      position: 1,
      consultant_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      deliverables: [
        { name: 'Relatório', description: 'Relatório de diagnóstico' },
      ],
    },
  });

export class CreateStageDto extends createZodDto(createStageSchema) {}

export const updateStageSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    delivery_date: z.string().min(1).optional(),
    deadline_date: z.string().min(1).optional(),
    position: z.number().int().positive().optional(),
    consultant_id: z.string().regex(UUID_REGEX, 'Invalid UUID').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Ao menos um campo deve ser informado',
  })
  .meta({
    example: { name: 'Diagnóstico Técnico Revisado' },
  });

export class UpdateStageDto extends createZodDto(updateStageSchema) {}

export interface StageListQuery {
  consultant_id?: string;
  status?: string;
}

export interface StageRow {
  id: string;
  project_id: string;
  delivery_date: Date | string;
  deadline_date: Date | string;
  name: string;
  description: string;
  position: number;
  consultant_id: string;
  status: (typeof PROJECT_STAGE_STATUSES)[number];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliverableRow {
  id: string;
  stage_id: string;
  name: string;
  description: string;
}
