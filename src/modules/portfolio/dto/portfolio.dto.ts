import { z } from 'zod';

export const createPortfolioItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const updatePortfolioItemSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreatePortfolioItemDto = z.infer<typeof createPortfolioItemSchema>;
export type UpdatePortfolioItemDto = z.infer<typeof updatePortfolioItemSchema>;

export interface PortfolioItemRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioItemResponse {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
