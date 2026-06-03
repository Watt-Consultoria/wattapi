import { z } from 'zod';

export const normSeverities = [
  'leve',
  'moderada',
  'grave',
  'desligamento',
] as const;
export type NormSeverity = (typeof normSeverities)[number];

export const createNormSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(normSeverities),
});

export const updateNormSchema = z.object({
  description: z.string().min(1).optional(),
  severity: z.enum(normSeverities).optional(),
});

export type CreateNormDto = z.infer<typeof createNormSchema>;
export type UpdateNormDto = z.infer<typeof updateNormSchema>;

export interface NormRow {
  id: string;
  code: string;
  description: string;
  severity: NormSeverity;
  created_at: Date;
  updated_at: Date;
}

export interface NormResponse {
  id: string;
  code: string;
  description: string;
  severity: NormSeverity;
  created_at: string;
  updated_at: string;
}
