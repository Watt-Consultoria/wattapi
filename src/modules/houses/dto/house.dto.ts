import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const assignHouseSchema = z
  .object({
    house_id: z
      .string()
      .regex(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
        'Invalid UUID',
      )
      .nullable(),
  })
  .meta({
    example: { house_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
  });

export class AssignHouseDto extends createZodDto(assignHouseSchema) {}

export interface HouseRow {
  id: string;
  name: string;
  created_at: Date;
}
