import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const almoxarifadoEmprestimoResponseSchema = z
  .object({
    id: z.string(),
    material_id: z.string(),
    quantidade: z.number(),
    user_id: z.string(),
    emprestado_em: z.string(),
    previsao_devolucao: z.string(),
    devolvido_em: z.string().nullable(),
    observacoes: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      material_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      quantidade: 1,
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      emprestado_em: '2026-01-01T00:00:00.000Z',
      previsao_devolucao: '2026-02-01T18:00:00.000Z',
      devolvido_em: null,
      observacoes: 'Para uso na obra X',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class AlmoxarifadoEmprestimoResponseDto extends createZodDto(
  almoxarifadoEmprestimoResponseSchema,
) {}

export type AlmoxarifadoEmprestimoResponse = z.infer<
  typeof almoxarifadoEmprestimoResponseSchema
>;
