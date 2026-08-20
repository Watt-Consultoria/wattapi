import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const REIMBURSEMENT_CATEGORIES = [
  'ingresso',
  'alimentação',
  'transporte',
  'equipamento',
  'outro',
] as const;

export const createReimbursementSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    amount_cents: z.number().int().positive(),
    category: z.enum(REIMBURSEMENT_CATEGORIES),
    pix_key: z.string().min(1),
    attachments: z
      .array(z.object({ path: z.string().min(1), name: z.string().min(1) }))
      .min(1, 'Pelo menos um comprovante é obrigatório'),
  })
  .meta({
    example: {
      title: 'Ingresso DevConf 2026',
      description: 'Participação em conferência de desenvolvimento',
      amount_cents: 15000,
      category: 'ingresso',
      pix_key: 'joao@empresa.com',
      attachments: [
        { path: 'receipts/user-uuid/some-uuid/nota.pdf', name: 'nota.pdf' },
      ],
    },
  });

export class CreateReimbursementDto extends createZodDto(
  createReimbursementSchema,
) {}

export const updateReimbursementStatusSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    account_id: z.string().guid().optional(),
    paid_amount_cents: z.number().int().positive().optional(),
    partial_reason: z.string().min(1).optional(),
  })
  .refine((data) => data.status !== 'approved' || !!data.account_id, {
    message: 'account_id é obrigatório ao aprovar um reembolso',
    path: ['account_id'],
  })
  .meta({
    example: {
      status: 'approved',
      account_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    },
  });

export class UpdateReimbursementStatusDto extends createZodDto(
  updateReimbursementStatusSchema,
) {}

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
  paid_amount_cents: number | null;
  partial_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
