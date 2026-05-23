import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  role: z
    .enum(['consultor', 'gerente', 'diretor', 'presidente', 'assessor'])
    .default('consultor'),
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
