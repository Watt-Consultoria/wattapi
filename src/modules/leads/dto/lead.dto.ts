import { z } from 'zod';

const LEAD_STATUSES = ['nao_contatado', 'em_progresso', 'contatado'] as const;

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj)) return false;

  const digits = cnpj.replace(/\D/g, '');

  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split('')
      .reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (firstDigit !== Number(digits[12])) return false;

  const secondDigit = calcDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return secondDigit === Number(digits[13]);
}

export function isValidCnpjDigits(digits: string): boolean {
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = slice
      .split('')
      .reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  if (firstDigit !== Number(digits[12])) return false;

  const secondDigit = calcDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return secondDigit === Number(digits[13]);
}

export function formatCnpj(digits: string): string {
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export const createLeadSchema = z.object({
  company_name: z.string().min(1),
  cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido'),
  address_logradouro: z.string().min(1),
  address_numero: z.string().min(1),
  address_complemento: z.string().optional(),
  address_bairro: z.string().min(1),
  address_cidade: z.string().min(1),
  address_estado: z.string().min(1),
  address_cep: z.string().min(1),
  status: z.enum(LEAD_STATUSES).optional(),
  interest_items: z.array(z.string().min(1)).optional(),
});

export const updateLeadSchema = z
  .object({
    company_name: z.string().min(1).optional(),
    cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido').optional(),
    address_logradouro: z.string().min(1).optional(),
    address_numero: z.string().min(1).optional(),
    address_complemento: z.string().optional(),
    address_bairro: z.string().min(1).optional(),
    address_cidade: z.string().min(1).optional(),
    address_estado: z.string().min(1).optional(),
    address_cep: z.string().min(1).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    interest_items: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const createContactSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
  })
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    message: 'Either email or phone must be provided',
  });

export const updateContactSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;
export type UpdateLeadDto = z.infer<typeof updateLeadSchema>;
export type CreateContactDto = z.infer<typeof createContactSchema>;
export type UpdateContactDto = z.infer<typeof updateContactSchema>;
export type CreateCommentDto = z.infer<typeof createCommentSchema>;
export type UpdateCommentDto = z.infer<typeof updateCommentSchema>;

export interface LeadRow {
  id: string;
  company_name: string;
  cnpj: string;
  created_by: string;
  status: string;
  address_logradouro: string;
  address_numero: string;
  address_complemento: string | null;
  address_bairro: string;
  address_cidade: string;
  address_estado: string;
  address_cep: string;
  interest_items: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ContactRow {
  id: string;
  lead_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
}

export interface CommentRow {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeadResponse {
  id: string;
  company_name: string;
  cnpj: string;
  created_by: string;
  status: string;
  address_logradouro: string;
  address_numero: string;
  address_complemento: string | null;
  address_bairro: string;
  address_cidade: string;
  address_estado: string;
  address_cep: string;
  interest_items: string[];
  created_at: string;
  updated_at: string;
}

export interface LeadDetailResponse extends LeadResponse {
  contacts: ContactRow[];
  comments: CommentResponse[];
}

export interface ContactResponse {
  id: string;
  lead_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
}

export interface CommentResponse {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
