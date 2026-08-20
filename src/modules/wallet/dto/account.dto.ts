import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const WALLET_ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'investment',
  'cash',
] as const;

export const createWalletAccountSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum(WALLET_ACCOUNT_TYPES),
    balance_cents: z.number().int().default(0),
  })
  .meta({
    example: {
      name: 'Conta Corrente Watt',
      type: 'checking',
      balance_cents: 0,
    },
  });

export class CreateWalletAccountDto extends createZodDto(
  createWalletAccountSchema,
) {}

export const updateWalletAccountSchema = z
  .object({
    name: z.string().min(1).optional(),
    type: z.enum(WALLET_ACCOUNT_TYPES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Ao menos um campo deve ser informado',
  })
  .meta({
    example: { name: 'Conta Corrente Watt Renomeada' },
  });

export class UpdateWalletAccountDto extends createZodDto(
  updateWalletAccountSchema,
) {}

export interface WalletAccountRow {
  id: string;
  name: string;
  type: (typeof WALLET_ACCOUNT_TYPES)[number];
  balance_cents: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
