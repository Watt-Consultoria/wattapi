import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const houseResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    total_points: z.number(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Lumina',
      total_points: 150,
    },
  });

export class HouseResponseDto extends createZodDto(houseResponseSchema) {}

export type HouseResponse = z.infer<typeof houseResponseSchema>;

export const houseMemberResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    sector: z.string(),
    house_id: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Ana Souza',
      email: 'ana@empresa.com',
      role: 'consultor',
      sector: 'projetos',
      house_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    },
  });

export class HouseMemberResponseDto extends createZodDto(
  houseMemberResponseSchema,
) {}

export type HouseMemberResponse = z.infer<typeof houseMemberResponseSchema>;

// `assignHouse` can clear a member's house assignment (house_id: null), so its
// response shape mirrors HouseMemberResponse but with a nullable house_id —
// matching the service's declared return type
// (`HouseMemberRow & { house_id: string | null }`).
export const assignHouseResponseSchema = houseMemberResponseSchema
  .extend({
    house_id: z.string().nullable(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Ana Souza',
      email: 'ana@empresa.com',
      role: 'consultor',
      sector: 'projetos',
      house_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    },
  });

export class AssignHouseResponseDto extends createZodDto(
  assignHouseResponseSchema,
) {}

export type AssignHouseResponse = z.infer<typeof assignHouseResponseSchema>;
