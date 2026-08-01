import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const databaseStatusSchema = z
  .object({
    max_connections: z.number(),
    opened_connections: z.number(),
  })
  .meta({
    example: { max_connections: 100, opened_connections: 3 },
  });

export type DatabaseStatus = z.infer<typeof databaseStatusSchema>;

export const statusResponseSchema = z
  .object({
    updated_at: z.string(),
    dependencies: z.object({
      database: databaseStatusSchema,
    }),
  })
  .meta({
    example: {
      updated_at: '2026-05-25T12:00:00.000Z',
      dependencies: {
        database: { max_connections: 100, opened_connections: 3 },
      },
    },
  });

export class StatusResponseDto extends createZodDto(statusResponseSchema) {}

export type StatusResponse = z.infer<typeof statusResponseSchema>;
