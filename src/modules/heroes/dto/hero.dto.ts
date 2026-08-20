import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createHeroSchema = z
  .object({
    user_id: z.string(),
    phrase: z.string().min(1),
    contributions: z.array(z.string().min(1)).min(1),
    start_year: z.number().int(),
    end_year: z.number().int(),
    photo_path: z.string().min(1),
  })
  .meta({
    example: {
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      phrase: 'Fez a diferença em tudo que tocou.',
      contributions: ['Liderou o projeto X', 'Mentorou 5 consultores'],
      start_year: 2020,
      end_year: 2023,
      photo_path: 'heroes/user-uuid/foto.jpg',
    },
  });

export class CreateHeroDto extends createZodDto(createHeroSchema) {}

export const updateHeroSchema = z
  .object({
    phrase: z.string().min(1).optional(),
    contributions: z.array(z.string().min(1)).min(1).optional(),
    start_year: z.number().int().optional(),
    end_year: z.number().int().optional(),
    photo_path: z.string().min(1).optional(),
  })
  .meta({
    example: {
      phrase: 'Frase atualizada.',
      contributions: ['Nova contribuição'],
    },
  });

export class UpdateHeroDto extends createZodDto(updateHeroSchema) {}

export interface HeroRow {
  id: string;
  user_id: string;
  phrase: string;
  contributions: string;
  start_year: number;
  end_year: number;
  photo_path: string;
  created_at: Date;
  updated_at: Date;
}
