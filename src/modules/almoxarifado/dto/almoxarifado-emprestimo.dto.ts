import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAlmoxarifadoEmprestimoSchema = z
  .object({
    material_id: z.string(),
    quantidade: z.number().int().positive(),
    previsao_devolucao: z.string(),
    observacoes: z.string().min(1).optional(),
  })
  .meta({
    example: {
      material_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      quantidade: 1,
      previsao_devolucao: '2026-02-01T18:00:00.000Z',
      observacoes: 'Para uso na obra X',
    },
  });

export class CreateAlmoxarifadoEmprestimoDto extends createZodDto(
  createAlmoxarifadoEmprestimoSchema,
) {}

export const returnAlmoxarifadoEmprestimoSchema = z
  .object({
    devolvido_em: z.string().optional(),
    observacoes: z.string().min(1).optional(),
  })
  .meta({
    example: {
      observacoes: 'Devolvido em bom estado',
    },
  });

export class ReturnAlmoxarifadoEmprestimoDto extends createZodDto(
  returnAlmoxarifadoEmprestimoSchema,
) {}

export interface AlmoxarifadoEmprestimoRow {
  id: string;
  material_id: string;
  quantidade: number;
  user_id: string;
  emprestado_em: Date;
  previsao_devolucao: Date;
  devolvido_em: Date | null;
  observacoes: string | null;
  atraso_notificado_em: Date | null;
  created_at: Date;
  updated_at: Date;
}
