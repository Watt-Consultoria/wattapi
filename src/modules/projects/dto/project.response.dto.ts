import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PROJECT_STATUSES } from './project.dto';

export const projectResponseSchema = z
  .object({
    id: z.string(),
    lead_id: z.string(),
    project_type_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    delivery_date: z.string(),
    closing_notes: z.string().nullable(),
    closed_by: z.string().nullable(),
    closed_at: z.string().nullable(),
    status: z.enum(PROJECT_STATUSES),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      project_type_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Projeto Watt',
      description: 'Descrição do projeto',
      delivery_date: '2027-01-01',
      closing_notes: null,
      closed_by: null,
      closed_at: null,
      status: 'em_andamento',
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class ProjectResponseDto extends createZodDto(projectResponseSchema) {}

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
