import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const interviewSlotResponseSchema = z
  .object({
    id: z.string(),
    selection_process_id: z.string(),
    consultant_id: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    booking_id: z.string().nullable(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      consultant_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      starts_at: '2027-01-20T14:00:00.000Z',
      ends_at: '2027-01-20T15:00:00.000Z',
      booking_id: null,
      created_at: '2026-12-01T00:00:00.000Z',
    },
  });

export class InterviewSlotResponseDto extends createZodDto(
  interviewSlotResponseSchema,
) {}

export type InterviewSlotResponse = z.infer<typeof interviewSlotResponseSchema>;

export const availableTimeSlotResponseSchema = z
  .object({
    starts_at: z.string(),
    ends_at: z.string(),
  })
  .meta({
    example: {
      starts_at: '2027-01-20T14:00:00.000Z',
      ends_at: '2027-01-20T15:00:00.000Z',
    },
  });

export class AvailableTimeSlotResponseDto extends createZodDto(
  availableTimeSlotResponseSchema,
) {}

export type AvailableTimeSlotResponse = z.infer<
  typeof availableTimeSlotResponseSchema
>;

export const interviewBookingResponseSchema = z
  .object({
    id: z.string(),
    selection_process_id: z.string(),
    candidate_id: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    booked_at: z.string(),
    meet_link: z.string().nullable(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      candidate_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      starts_at: '2027-01-01T11:00:00.000Z',
      ends_at: '2027-01-01T12:00:00.000Z',
      booked_at: '2026-12-15T00:00:00.000Z',
      meet_link: 'https://meet.google.com/abc-defg-hij',
      created_at: '2026-12-15T00:00:00.000Z',
    },
  });

export class InterviewBookingResponseDto extends createZodDto(
  interviewBookingResponseSchema,
) {}

export type InterviewBookingResponse = z.infer<
  typeof interviewBookingResponseSchema
>;

export const mySlotResponseSchema = z
  .object({
    id: z.string(),
    selection_process_id: z.string(),
    consultant_id: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    booking_id: z.string().nullable(),
    created_at: z.string(),
    consultant_name: z.string().optional(),
    candidate_name: z.string().nullable(),
    candidate_email: z.string().nullable(),
    pair_name: z.string().nullable().optional(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      consultant_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      consultant_name: 'Maria Silva',
      starts_at: '2027-01-20T14:00:00.000Z',
      ends_at: '2027-01-20T15:00:00.000Z',
      booking_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      candidate_name: 'João Costa',
      candidate_email: 'joao@example.com',
      pair_name: 'Carlos Mendes',
      created_at: '2026-06-22T10:00:00.000Z',
    },
  });

export class MySlotResponseDto extends createZodDto(mySlotResponseSchema) {}

export type MySlotResponse = z.infer<typeof mySlotResponseSchema>;

export const sendLinksResultSchema = z
  .object({
    candidate_id: z.string(),
    success: z.boolean(),
  })
  .meta({
    example: {
      candidate_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      success: true,
    },
  });

export class SendLinksResultDto extends createZodDto(sendLinksResultSchema) {}

export type SendLinksResult = z.infer<typeof sendLinksResultSchema>;

export const sendEmailResultSchema = z
  .object({
    successes: z.number(),
    errors: z.number(),
  })
  .meta({ example: { successes: 2, errors: 0 } });

export class SendEmailResultDto extends createZodDto(sendEmailResultSchema) {}

export type SendEmailResult = z.infer<typeof sendEmailResultSchema>;
