import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { REIMBURSEMENT_CATEGORIES } from '../../reimbursements/dto/reimbursement.dto';

export const WALLET_TRANSACTION_TYPES = ['income', 'expense'] as const;

export const createWalletTransactionSchema = z
  .object({
    account_id: z.string().guid(),
    type: z.enum(WALLET_TRANSACTION_TYPES),
    amount_cents: z.number().int().positive(),
    category: z.enum(REIMBURSEMENT_CATEGORIES),
    description: z.string().min(1),
    transaction_date: z.string().min(1),
  })
  .meta({
    example: {
      account_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      type: 'expense',
      amount_cents: 5000,
      category: 'outro',
      description: 'Compra de material de escritório',
      transaction_date: '2026-01-01',
    },
  });

export class CreateWalletTransactionDto extends createZodDto(
  createWalletTransactionSchema,
) {}

export interface WalletTransactionListQuery {
  account_id?: string;
}

export interface WalletTransactionRow {
  id: string;
  account_id: string;
  type: (typeof WALLET_TRANSACTION_TYPES)[number];
  amount_cents: number;
  category: (typeof REIMBURSEMENT_CATEGORIES)[number];
  description: string;
  transaction_date: Date | string;
  created_by: string;
  created_at: Date;
}
