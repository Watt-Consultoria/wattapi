import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    sector: z.enum([
      'projetos',
      'comercial',
      'marketing',
      'executivo',
      'institucional',
    ]),
    cpf: z
      .string()
      .regex(/^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/),
  })
  .meta({
    example: {
      name: 'João Silva',
      sector: 'projetos',
      cpf: '12345678901',
    },
  });

export class CreateUserDto extends createZodDto(createUserSchema) {}

export const updateUserSchema = z
  .object({
    email: z.email().optional(),
    name: z.string().min(1).optional(),
    role: z
      .enum(['consultor', 'gerente', 'diretor', 'presidente', 'assessor'])
      .optional(),
    sector: z
      .enum([
        'projetos',
        'comercial',
        'marketing',
        'executivo',
        'institucional',
      ])
      .optional(),
    cpf: z
      .string()
      .regex(/^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/)
      .optional(),
  })
  .meta({
    example: {
      email: 'novo@empresa.com',
      name: 'Novo Nome',
      role: 'gerente',
      sector: 'comercial',
      cpf: '98765432100',
    },
  });

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
