import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { WALLET_TRANSACTION_TYPES } from './transaction.dto';
import { REIMBURSEMENT_CATEGORIES } from '../../reimbursements/dto/reimbursement.dto';

export const walletTransactionResponseSchema = z
  .object({
    id: z.string(),
    account_id: z.string(),
    type: z.enum(WALLET_TRANSACTION_TYPES),
    amount_cents: z.number(),
    category: z.enum(REIMBURSEMENT_CATEGORIES),
    description: z.string(),
    transaction_date: z.string(),
    created_by: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      account_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      type: 'expense',
      amount_cents: 5000,
      category: 'outro',
      description: 'Compra de material de escritório',
      transaction_date: '2026-01-01',
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class WalletTransactionResponseDto extends createZodDto(
  walletTransactionResponseSchema,
) {}

export type WalletTransactionResponse = z.infer<
  typeof walletTransactionResponseSchema
>;
