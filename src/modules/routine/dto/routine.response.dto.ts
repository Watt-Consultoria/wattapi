import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const daySlots = z.array(z.boolean()).length(14);

const slotsGridSchema = z.object({
  mon: daySlots,
  tue: daySlots,
  wed: daySlots,
  thu: daySlots,
  fri: daySlots,
  sat: daySlots,
  sun: daySlots,
});

const exampleDaySlots = [
  true,
  false,
  true,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
];

export const routineSlotsResponseSchema = z
  .object({
    slots: slotsGridSchema.nullable(),
  })
  .meta({
    example: {
      slots: {
        mon: exampleDaySlots,
        tue: exampleDaySlots,
        wed: exampleDaySlots,
        thu: exampleDaySlots,
        fri: exampleDaySlots,
        sat: exampleDaySlots,
        sun: exampleDaySlots,
      },
    },
  });

export class RoutineSlotsResponseDto extends createZodDto(
  routineSlotsResponseSchema,
) {}

export const summaryUserEntryResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    sector: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Ana',
      role: 'consultor',
      sector: 'projetos',
    },
  });

export const summaryResponseSchema = z
  .object({
    availability: z.record(
      z.string(),
      z.record(z.string(), z.array(summaryUserEntryResponseSchema)),
    ),
    unconfigured: z.array(summaryUserEntryResponseSchema),
  })
  .meta({
    example: {
      availability: {
        mon: {
          '8': [
            {
              id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              name: 'Ana',
              role: 'consultor',
              sector: 'projetos',
            },
          ],
          '14': [
            {
              id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              name: 'Ana',
              role: 'consultor',
              sector: 'projetos',
            },
          ],
        },
      },
      unconfigured: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Carlos',
          role: 'gerente',
          sector: 'projetos',
        },
      ],
    },
  });

export class SummaryResponseDto extends createZodDto(summaryResponseSchema) {}
