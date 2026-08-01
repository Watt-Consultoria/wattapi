import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createPortfolioItemSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
  })
  .meta({
    example: {
      name: 'Auditoria Elétrica',
      description: 'Verificação de instalações',
    },
  });

export class CreatePortfolioItemDto extends createZodDto(
  createPortfolioItemSchema,
) {}

export const updatePortfolioItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .meta({
    example: {
      name: 'Auditoria Elétrica',
      description: 'Verificação completa de instalações elétricas',
    },
  });

export class UpdatePortfolioItemDto extends createZodDto(
  updatePortfolioItemSchema,
) {}

export interface PortfolioItemRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}
