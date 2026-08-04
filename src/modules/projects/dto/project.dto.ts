import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

export const PROJECT_STATUSES = [
  'em_andamento',
  'em_revisao',
  'revisado',
  'finalizado',
] as const;

export const createProjectSchema = z
  .object({
    lead_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    project_type_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    name: z.string().min(1),
    description: z.string().optional(),
    delivery_date: z.string().min(1),
  })
  .meta({
    example: {
      lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      project_type_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Projeto Watt',
      description: 'Descrição do projeto',
      delivery_date: '2027-01-01',
    },
  });

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

export const updateProjectSchema = z
  .object({
    status: z.enum(['em_revisao', 'finalizado']),
    closing_notes: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== 'finalizado' || !!data.closing_notes, {
    message: 'closing_notes é obrigatório ao finalizar o projeto',
    path: ['closing_notes'],
  })
  .meta({
    example: {
      status: 'finalizado',
      closing_notes: 'Projeto entregue com sucesso',
    },
  });

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}

export interface ProjectListQuery {
  status?: string;
  lead_id?: string;
  created_by?: string;
  consultant_id?: string;
}

export interface ProjectRow {
  id: string;
  lead_id: string;
  project_type_id: string;
  name: string;
  description: string | null;
  delivery_date: Date | string;
  closing_notes: string | null;
  closed_by: string | null;
  closed_at: Date | null;
  status: (typeof PROJECT_STATUSES)[number];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
