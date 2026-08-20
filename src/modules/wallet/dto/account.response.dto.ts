import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { WALLET_ACCOUNT_TYPES } from './account.dto';

export const walletAccountResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: z.enum(WALLET_ACCOUNT_TYPES),
    balance_cents: z.number(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Conta Corrente Watt',
      type: 'checking',
      balance_cents: 0,
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class WalletAccountResponseDto extends createZodDto(
  walletAccountResponseSchema,
) {}

export type WalletAccountResponse = z.infer<typeof walletAccountResponseSchema>;
