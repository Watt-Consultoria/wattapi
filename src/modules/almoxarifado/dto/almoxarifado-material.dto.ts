import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createAlmoxarifadoMaterialSchema = z
  .object({
    nome: z.string().min(1),
    descricao: z.string().min(1),
    quantidade_estoque: z.number().int().min(0),
    observacoes: z.string().min(1).optional(),
  })
  .meta({
    example: {
      nome: 'Furadeira de Impacto',
      descricao: 'Furadeira de impacto Bosch 750W',
      quantidade_estoque: 5,
      observacoes: 'Em bom estado',
    },
  });

export class CreateAlmoxarifadoMaterialDto extends createZodDto(
  createAlmoxarifadoMaterialSchema,
) {}

export const updateAlmoxarifadoMaterialSchema = z
  .object({
    nome: z.string().min(1).optional(),
    descricao: z.string().min(1).optional(),
    quantidade_estoque: z.number().int().min(0).optional(),
    observacoes: z.string().min(1).optional(),
  })
  .meta({
    example: {
      quantidade_estoque: 8,
    },
  });

export class UpdateAlmoxarifadoMaterialDto extends createZodDto(
  updateAlmoxarifadoMaterialSchema,
) {}

export interface AlmoxarifadoMaterialRow {
  id: string;
  nome: string;
  descricao: string;
  quantidade_estoque: number;
  observacoes: string | null;
  created_at: Date;
  updated_at: Date;
}
