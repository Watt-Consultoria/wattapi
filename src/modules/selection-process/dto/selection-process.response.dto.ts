import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const selectionProcessResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Processo Seletivo 2026.1',
      starts_at: '2026-03-01T00:00:00.000Z',
      ends_at: '2026-04-01T00:00:00.000Z',
      created_at: '2026-02-15T00:00:00.000Z',
    },
  });

export class SelectionProcessResponseDto extends createZodDto(
  selectionProcessResponseSchema,
) {}

export type SelectionProcessResponse = z.infer<
  typeof selectionProcessResponseSchema
>;
