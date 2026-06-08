import { z } from 'zod';

export const assignHouseSchema = z.object({
  house_id: z
    .string()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i,
      'Invalid UUID',
    )
    .nullable(),
});

export type AssignHouseDto = z.infer<typeof assignHouseSchema>;

export interface HouseRow {
  id: string;
  name: string;
  created_at: Date;
}

export interface HouseResponse {
  id: string;
  name: string;
  total_points: number;
}

export interface HouseMemberResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  house_id: string;
}
