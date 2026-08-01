import { createZodDto } from 'nestjs-zod';
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

export const createLeadSchema = z
  .object({
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
  })
  .meta({
    example: {
      company_name: 'Empresa ABC',
      cnpj: '12.345.678/0001-95',
      address_logradouro: 'Rua das Flores',
      address_numero: '42',
      address_bairro: 'Jardim Paulista',
      address_cidade: 'São Paulo',
      address_estado: 'SP',
      address_cep: '01310100',
      status: 'nao_contatado',
      interest_items: ['Consultoria Energética'],
    },
  });

export class CreateLeadDto extends createZodDto(createLeadSchema) {}

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
  })
  .meta({
    example: {
      company_name: 'Empresa ABC Ltda',
      status: 'em_progresso',
    },
  });

export class UpdateLeadDto extends createZodDto(updateLeadSchema) {}

export const createContactSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
  })
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    message: 'Either email or phone must be provided',
  })
  .meta({
    example: {
      name: 'João Silva',
      role: 'Diretor',
      email: 'joao@empresa.com',
      phone: '11999999999',
    },
  });

export class CreateContactDto extends createZodDto(createContactSchema) {}

export const updateContactSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .meta({ example: { phone: '11988888888' } });

export class UpdateContactDto extends createZodDto(updateContactSchema) {}

export const createCommentSchema = z
  .object({
    content: z.string().min(1, 'Content cannot be empty'),
  })
  .meta({
    example: { content: 'Cliente demonstrou interesse em auditoria.' },
  });

export class CreateCommentDto extends createZodDto(createCommentSchema) {}

export const updateCommentSchema = z
  .object({
    content: z.string().min(1, 'Content cannot be empty'),
  })
  .meta({ example: { content: 'Texto corrigido.' } });

export class UpdateCommentDto extends createZodDto(updateCommentSchema) {}

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
