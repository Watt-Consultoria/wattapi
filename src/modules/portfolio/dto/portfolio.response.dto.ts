import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const portfolioItemResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Consultoria Energética',
      description: 'Análise de consumo energético',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class PortfolioItemResponseDto extends createZodDto(
  portfolioItemResponseSchema,
) {}

export type PortfolioItemResponse = z.infer<typeof portfolioItemResponseSchema>;
