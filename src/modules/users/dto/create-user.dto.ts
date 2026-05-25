import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserBody {
  @ApiProperty({ example: 'João Silva', minLength: 1 })
  name: string;

  @ApiProperty({
    enum: ['projetos', 'comercial', 'marketing', 'executivo', 'institucional'],
    example: 'projetos',
  })
  sector: string;

  @ApiProperty({
    example: '123.456.789-09',
    description: 'CPF sem ou com formatação (11 dígitos ou 000.000.000-00)',
  })
  cpf: string;
}

export class UpdateUserBody {
  @ApiPropertyOptional({ example: 'joao@empresa.com', format: 'email' })
  email?: string;

  @ApiPropertyOptional({ example: 'João Silva', minLength: 1 })
  name?: string;

  @ApiPropertyOptional({
    enum: ['consultor', 'gerente', 'diretor', 'assessor', 'presidente'],
    example: 'gerente',
    description: 'Apenas superusuários (assessor/presidente) podem alterar',
  })
  role?: string;

  @ApiPropertyOptional({
    enum: ['projetos', 'comercial', 'marketing', 'executivo', 'institucional'],
    example: 'comercial',
  })
  sector?: string;

  @ApiPropertyOptional({
    example: '123.456.789-09',
    description: 'CPF sem ou com formatação (11 dígitos ou 000.000.000-00)',
  })
  cpf?: string;
}

export class UserResponseSchema {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  email: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({
    enum: ['consultor', 'gerente', 'diretor', 'assessor', 'presidente'],
    example: 'consultor',
  })
  role: string;

  @ApiProperty({
    enum: ['projetos', 'comercial', 'marketing', 'executivo', 'institucional'],
    example: 'projetos',
  })
  sector: string;

  @ApiProperty({
    example: '123.456.789-09',
    description:
      'Visível apenas para rank >= 2 (diretor+), exceto o próprio usuário',
    nullable: true,
  })
  cpf: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z', format: 'date-time' })
  created_at: string;

  @ApiProperty({ example: '2026-05-20T14:30:00.000Z', format: 'date-time' })
  updated_at: string;
}

export const createUserSchema = z.object({
  name: z.string().min(1),
  sector: z.enum([
    'projetos',
    'comercial',
    'marketing',
    'executivo',
    'institucional',
  ]),
  cpf: z.string().regex(/^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.email().optional(),
  name: z.string().min(1).optional(),
  role: z
    .enum(['consultor', 'gerente', 'diretor', 'presidente', 'assessor'])
    .optional(),
  sector: z
    .enum(['projetos', 'comercial', 'marketing', 'executivo', 'institucional'])
    .optional(),
  cpf: z
    .string()
    .regex(/^([0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/)
    .optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
