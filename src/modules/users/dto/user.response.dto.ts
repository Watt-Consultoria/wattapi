import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const userResponseSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
    sector: z.string(),
    cpf: z
      .string()
      .optional()
      .describe(
        'Presente apenas se quem consulta tem rank >= 2 (gerente ou acima) ou é o próprio usuário consultado — ver RoutePolicy.output.',
      ),
    house_id: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      email: 'joao@empresa.com',
      name: 'João Silva',
      role: 'consultor',
      sector: 'projetos',
      cpf: '123.456.789-09',
      house_id: null,
      created_at: '2026-01-15T10:00:00.000Z',
      updated_at: '2026-05-20T14:30:00.000Z',
    },
  });

export class UserResponseDto extends createZodDto(userResponseSchema) {}

export type UserResponse = z.infer<typeof userResponseSchema>;
