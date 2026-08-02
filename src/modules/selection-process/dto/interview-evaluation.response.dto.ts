import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const interviewEvaluationResponseSchema = z
  .object({
    id: z.string(),
    booking_id: z.string(),
    evaluator_id: z.string(),
    proatividade: z.number(),
    lideranca: z.number(),
    transparencia: z.number(),
    uniao_de_time: z.number(),
    comunicacao: z.number(),
    seriedade: z.number(),
    compromisso: z.number(),
    proposito: z.number(),
    autoresponsabilidade: z.number(),
    autoconfianca: z.number(),
    responsabilidade_social: z.number(),
    criatividade: z.number(),
    procrastinacao: z.boolean(),
    desinteresse: z.boolean(),
    falta_de_transparencia: z.boolean(),
    proposito_vago: z.boolean(),
    vitimizacao: z.boolean(),
    falta_de_confianca: z.boolean(),
    observacoes: z.string().nullable(),
    created_at: z.string(),
  })
  .meta({
    example: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      booking_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      evaluator_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      proatividade: 4,
      lideranca: 3,
      transparencia: 5,
      uniao_de_time: 4,
      comunicacao: 3,
      seriedade: 5,
      compromisso: 4,
      proposito: 3,
      autoresponsabilidade: 5,
      autoconfianca: 4,
      responsabilidade_social: 3,
      criatividade: 5,
      procrastinacao: false,
      desinteresse: false,
      falta_de_transparencia: false,
      proposito_vago: false,
      vitimizacao: false,
      falta_de_confianca: false,
      observacoes: 'Candidato demonstrou boa comunicação.',
      created_at: '2027-01-20T16:00:00.000Z',
    },
  });

export class InterviewEvaluationResponseDto extends createZodDto(
  interviewEvaluationResponseSchema,
) {}

export type InterviewEvaluationResponse = z.infer<
  typeof interviewEvaluationResponseSchema
>;

export const interviewEvaluationWithCandidateResponseSchema =
  interviewEvaluationResponseSchema
    .extend({
      candidate_id: z.string(),
      candidate_name: z.string(),
    })
    .meta({
      example: {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        booking_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        evaluator_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        candidate_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        candidate_name: 'João Costa',
        proatividade: 4,
        lideranca: 3,
        transparencia: 5,
        uniao_de_time: 4,
        comunicacao: 3,
        seriedade: 5,
        compromisso: 4,
        proposito: 3,
        autoresponsabilidade: 5,
        autoconfianca: 4,
        responsabilidade_social: 3,
        criatividade: 5,
        procrastinacao: false,
        desinteresse: false,
        falta_de_transparencia: false,
        proposito_vago: false,
        vitimizacao: false,
        falta_de_confianca: false,
        observacoes: 'Candidato demonstrou boa comunicação.',
        created_at: '2027-01-20T16:00:00.000Z',
      },
    });

export class InterviewEvaluationWithCandidateResponseDto extends createZodDto(
  interviewEvaluationWithCandidateResponseSchema,
) {}

export type InterviewEvaluationWithCandidateResponse = z.infer<
  typeof interviewEvaluationWithCandidateResponseSchema
>;
