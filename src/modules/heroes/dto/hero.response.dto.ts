import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const heroResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    name: z.string(),
    role: z.string(),
    phrase: z.string(),
    contributions: z.array(z.string()),
    start_year: z.number(),
    end_year: z.number(),
    photo_url: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'João Silva',
      role: 'consultor',
      phrase: 'Fez a diferença em tudo que tocou.',
      contributions: ['Liderou o projeto X', 'Mentorou 5 consultores'],
      start_year: 2020,
      end_year: 2023,
      photo_url: 'https://storage.example.com/hero-photos/signed-url',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class HeroResponseDto extends createZodDto(heroResponseSchema) {}

export type HeroResponse = z.infer<typeof heroResponseSchema>;
