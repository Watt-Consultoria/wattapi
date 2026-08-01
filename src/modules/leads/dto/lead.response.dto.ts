import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const leadResponseSchema = z
  .object({
    id: z.string(),
    company_name: z.string(),
    cnpj: z.string(),
    created_by: z.string(),
    status: z.string(),
    address_logradouro: z.string(),
    address_numero: z.string(),
    address_complemento: z.string().nullable(),
    address_bairro: z.string(),
    address_cidade: z.string(),
    address_estado: z.string(),
    address_cep: z.string(),
    interest_items: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      company_name: 'Empresa ABC',
      cnpj: '12.345.678/0001-95',
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      status: 'nao_contatado',
      address_logradouro: 'Rua das Flores',
      address_numero: '42',
      address_complemento: null,
      address_bairro: 'Jardim Paulista',
      address_cidade: 'São Paulo',
      address_estado: 'SP',
      address_cep: '01310100',
      interest_items: ['Consultoria Energética'],
      created_at: '2026-05-25T12:00:00.000Z',
      updated_at: '2026-05-25T12:00:00.000Z',
    },
  });

export class LeadResponseDto extends createZodDto(leadResponseSchema) {}

export type LeadResponse = z.infer<typeof leadResponseSchema>;

export const contactResponseSchema = z
  .object({
    id: z.string(),
    lead_id: z.string(),
    name: z.string(),
    role: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'João Silva',
      role: 'Diretor',
      email: 'joao@empresa.com',
      phone: null,
    },
  });

export class ContactResponseDto extends createZodDto(contactResponseSchema) {}

export type ContactResponse = z.infer<typeof contactResponseSchema>;

export const commentResponseSchema = z
  .object({
    id: z.string(),
    lead_id: z.string(),
    user_id: z.string(),
    content: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      content: 'Cliente demonstrou interesse em auditoria.',
      created_at: '2026-05-25T12:00:00.000Z',
      updated_at: '2026-05-25T12:00:00.000Z',
    },
  });

export class CommentResponseDto extends createZodDto(commentResponseSchema) {}

export type CommentResponse = z.infer<typeof commentResponseSchema>;

export const leadDetailResponseSchema = leadResponseSchema
  .extend({
    contacts: z.array(contactResponseSchema),
    comments: z.array(commentResponseSchema),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      company_name: 'Empresa ABC',
      cnpj: '12.345.678/0001-95',
      created_by: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      status: 'nao_contatado',
      address_logradouro: 'Rua das Flores',
      address_numero: '42',
      address_complemento: null,
      address_bairro: 'Jardim Paulista',
      address_cidade: 'São Paulo',
      address_estado: 'SP',
      address_cep: '01310100',
      interest_items: ['Consultoria Energética'],
      contacts: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'João Silva',
          role: 'Diretor',
          email: 'joao@empresa.com',
          phone: null,
        },
      ],
      comments: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          lead_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          content: 'Cliente demonstrou interesse em auditoria.',
          created_at: '2026-05-25T12:00:00.000Z',
          updated_at: '2026-05-25T12:00:00.000Z',
        },
      ],
      created_at: '2026-05-25T12:00:00.000Z',
      updated_at: '2026-05-25T12:00:00.000Z',
    },
  });

export class LeadDetailResponseDto extends createZodDto(
  leadDetailResponseSchema,
) {}

export type LeadDetailResponse = z.infer<typeof leadDetailResponseSchema>;
