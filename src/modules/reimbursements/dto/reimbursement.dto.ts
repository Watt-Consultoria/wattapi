import { z } from 'zod';

export const REIMBURSEMENT_CATEGORIES = [
  'ingresso',
  'alimentação',
  'transporte',
  'equipamento',
  'outro',
] as const;

export const createReimbursementSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  amount_cents: z.number().int().positive(),
  category: z.enum(REIMBURSEMENT_CATEGORIES),
  pix_key: z.string().min(1),
  attachments: z
    .array(z.object({ path: z.string().min(1), name: z.string().min(1) }))
    .min(1, 'Pelo menos um comprovante é obrigatório'),
});

export const updateReimbursementStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type CreateReimbursementDto = z.infer<typeof createReimbursementSchema>;
export type UpdateReimbursementStatusDto = z.infer<
  typeof updateReimbursementStatusSchema
>;

export interface ReimbursementAttachmentRow {
  id: string;
  reimbursement_id: string;
  path: string;
  name: string;
  created_at: Date;
}

export interface ReimbursementRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount_cents: number;
  category: (typeof REIMBURSEMENT_CATEGORIES)[number];
  pix_key: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

export interface ReimbursementAttachmentResponse {
  id: string;
  name: string;
  signed_url: string;
}

export interface ReimbursementResponse {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount_cents: number;
  category: string;
  pix_key: string;
  status: 'pending' | 'approved' | 'rejected';
  attachments: ReimbursementAttachmentResponse[];
  created_at: string;
  updated_at: string;
}
