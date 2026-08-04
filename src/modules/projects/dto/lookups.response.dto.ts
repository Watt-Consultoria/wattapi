import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const leadLookupSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  status: z.string(),
});

export const portfolioItemLookupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const consultantLookupSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export const projectLookupsResponseSchema = z
  .object({
    leads: z.array(leadLookupSchema),
    portfolio_items: z.array(portfolioItemLookupSchema),
    consultants: z.array(consultantLookupSchema),
  })
  .meta({
    example: {
      leads: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          company_name: 'Empresa X',
          status: 'em_progresso',
        },
      ],
      portfolio_items: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Consultoria Financeira',
          description: 'Diagnóstico e planejamento financeiro',
        },
      ],
      consultants: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'João Silva',
          email: 'joao@watt.com',
        },
      ],
    },
  });

export class ProjectLookupsResponseDto extends createZodDto(
  projectLookupsResponseSchema,
) {}

export type ProjectLookupsResponse = z.infer<
  typeof projectLookupsResponseSchema
>;
