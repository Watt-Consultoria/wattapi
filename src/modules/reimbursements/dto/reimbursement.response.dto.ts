import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const reimbursementAttachmentResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    signed_url: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'nota.pdf',
      signed_url:
        'https://storage.example.com/reimbursement-receipts/signed-url',
    },
  });

export class ReimbursementAttachmentResponseDto extends createZodDto(
  reimbursementAttachmentResponseSchema,
) {}

export const reimbursementResponseSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    title: z.string(),
    description: z.string(),
    amount_cents: z.number(),
    category: z.string(),
    pix_key: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    paid_amount_cents: z.number().nullable(),
    partial_reason: z.string().nullable(),
    attachments: z.array(reimbursementAttachmentResponseSchema),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      user_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Ingresso DevConf 2026',
      description: 'Participação em conferência de desenvolvimento',
      amount_cents: 15000,
      category: 'ingresso',
      pix_key: 'joao@empresa.com',
      status: 'pending',
      paid_amount_cents: null,
      partial_reason: null,
      attachments: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'nota.pdf',
          signed_url:
            'https://storage.example.com/reimbursement-receipts/signed-url',
        },
      ],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  });

export class ReimbursementResponseDto extends createZodDto(
  reimbursementResponseSchema,
) {}

export type ReimbursementAttachmentResponse = z.infer<
  typeof reimbursementAttachmentResponseSchema
>;
export type ReimbursementResponse = z.infer<typeof reimbursementResponseSchema>;
