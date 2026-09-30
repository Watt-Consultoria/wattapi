import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const almoxarifadoMaterialResponseSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    descricao: z.string(),
    quantidade_estoque: z.number(),
    observacoes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      nome: 'Furadeira de Impacto',
      descricao: 'Furadeira de impacto Bosch 750W',
      quantidade_estoque: 5,
      observacoes: 'Em bom estado',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class AlmoxarifadoMaterialResponseDto extends createZodDto(
  almoxarifadoMaterialResponseSchema,
) {}

export type AlmoxarifadoMaterialResponse = z.infer<
  typeof almoxarifadoMaterialResponseSchema
>;
