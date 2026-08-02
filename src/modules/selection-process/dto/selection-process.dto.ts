import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SHIRT_SIZES = ['P', 'M', 'G', 'GG', 'XG'] as const;
export const APPLICATION_STATUSES = [
  'pending',
  'approved',
  'reproved',
] as const;
export const CANDIDATE_STATUSES = ['active', 'eliminated', 'approved'] as const;

const FILE_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(resume|transcript|photo)\.[a-zA-Z]{2,4}$/;

export const createProcessSchema = z
  .object({
    title: z.string().min(1),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: 'ends_at must be after starts_at',
    path: ['ends_at'],
  })
  .meta({
    example: {
      title: 'Processo Seletivo 2026.1',
      starts_at: '2026-03-01T00:00:00Z',
      ends_at: '2026-04-01T00:00:00Z',
    },
  });

export class CreateProcessDto extends createZodDto(createProcessSchema) {}

export const updateProcessSchema = z
  .object({
    title: z.string().min(1).optional(),
    starts_at: z.string().datetime({ offset: true }).optional(),
    ends_at: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(
    (d) =>
      d.starts_at === undefined ||
      d.ends_at === undefined ||
      new Date(d.ends_at) > new Date(d.starts_at),
    { message: 'ends_at must be after starts_at', path: ['ends_at'] },
  )
  .meta({
    example: { title: 'Processo Seletivo 2026.1 - Revisado' },
  });

export class UpdateProcessDto extends createZodDto(updateProcessSchema) {}

export const createApplicationSchema = z
  .object({
    name: z.string().min(1),
    course: z.string().min(1),
    period: z.number().int().positive(),
    phone: z.string().min(1),
    email: z.string().email(),
    instagram: z.string().min(1),
    how_heard: z.string().min(1),
    motivation: z.string().min(1),
    why_watt: z.string().min(1),
    shirt_size: z.enum(SHIRT_SIZES),
    resume_path: z
      .string()
      .regex(FILE_PATH_REGEX, 'Invalid resume path format'),
    transcript_path: z
      .string()
      .regex(FILE_PATH_REGEX, 'Invalid transcript path format'),
    photo_path: z.string().regex(FILE_PATH_REGEX, 'Invalid photo path format'),
  })
  .meta({
    example: {
      name: 'João da Silva',
      course: 'Engenharia de Software',
      period: 5,
      phone: '11999990000',
      email: 'joao@example.com',
      instagram: '@joaosilva',
      how_heard: 'Indicação de amigo',
      motivation: 'Quero aprender e crescer profissionalmente',
      why_watt: 'A Watt tem projetos alinhados com meus valores',
      shirt_size: 'M',
      resume_path: '550e8400-e29b-41d4-a716-446655440000/resume.pdf',
      transcript_path: '550e8400-e29b-41d4-a716-446655440000/transcript.pdf',
      photo_path: '550e8400-e29b-41d4-a716-446655440000/photo.jpg',
    },
  });

export class CreateApplicationDto extends createZodDto(
  createApplicationSchema,
) {}

export const updateApplicationStatusSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES),
  })
  .meta({ example: { status: 'approved' } });

export class UpdateApplicationStatusDto extends createZodDto(
  updateApplicationStatusSchema,
) {}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

export const createStageSchema = z
  .object({
    selection_process_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    name: z.string().min(1),
    position: z.number().int().positive(),
    shift: z.boolean().optional(),
  })
  .meta({
    example: {
      selection_process_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Entrevista',
      position: 1,
    },
  });

export class CreateStageDto extends createZodDto(createStageSchema) {}

export const updateStageSchema = z
  .object({
    name: z.string().min(1).optional(),
    position: z.number().int().positive().optional(),
  })
  .refine((d) => d.name !== undefined || d.position !== undefined, {
    message: 'At least one of name or position must be provided',
  })
  .meta({
    example: { name: 'Entrevista Técnica', position: 2 },
  });

export class UpdateStageDto extends createZodDto(updateStageSchema) {}

export const updateCandidateStatusSchema = z
  .object({
    status: z.enum(['approved', 'reproved'] as const),
  })
  .meta({ example: { status: 'approved' } });

export class UpdateCandidateStatusDto extends createZodDto(
  updateCandidateStatusSchema,
) {}

export const createInterviewSlotsSchema = z
  .object({
    slots: z.array(z.string().datetime({ offset: true })).min(1),
  })
  .meta({
    example: {
      slots: ['2027-01-20T14:00:00Z', '2027-01-21T09:00:00Z'],
    },
  });

export class CreateInterviewSlotsDto extends createZodDto(
  createInterviewSlotsSchema,
) {}

export const bookInterviewSlotSchema = z
  .object({
    starts_at: z.string().datetime({ offset: true }),
    token: z.string().min(1),
  })
  .meta({
    example: { starts_at: '2027-01-20T14:00:00Z', token: 'abc123...' },
  });

export class BookInterviewSlotDto extends createZodDto(
  bookInterviewSlotSchema,
) {}

export const sendInterviewLinksSchema = z
  .object({
    candidate_ids: z.array(z.string().regex(UUID_REGEX)).min(1),
  })
  .meta({
    example: {
      candidate_ids: [
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        '5c9d6a2e-8b4f-4e1a-9c3d-7f2a1b6e4d8c',
      ],
    },
  });

export class SendInterviewLinksDto extends createZodDto(
  sendInterviewLinksSchema,
) {}

export const sendMeetLinkSchema = z
  .object({
    booking_id: z.string().regex(UUID_REGEX, 'Invalid UUID'),
    meet_link: z
      .string()
      .regex(
        /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/,
        'Invalid Google Meet link format',
      ),
  })
  .meta({
    example: {
      booking_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      meet_link: 'https://meet.google.com/abc-defg-hij',
    },
  });

export class SendMeetLinkDto extends createZodDto(sendMeetLinkSchema) {}

const scoreField = z.number().int().min(1).max(5);

export const createInterviewEvaluationSchema = z
  .object({
    proatividade: scoreField,
    lideranca: scoreField,
    transparencia: scoreField,
    uniao_de_time: scoreField,
    comunicacao: scoreField,
    seriedade: scoreField,
    compromisso: scoreField,
    proposito: scoreField,
    autoresponsabilidade: scoreField,
    autoconfianca: scoreField,
    responsabilidade_social: scoreField,
    criatividade: scoreField,
    procrastinacao: z.boolean(),
    desinteresse: z.boolean(),
    falta_de_transparencia: z.boolean(),
    proposito_vago: z.boolean(),
    vitimizacao: z.boolean(),
    falta_de_confianca: z.boolean(),
    observacoes: z.string().optional(),
  })
  .meta({
    example: {
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
    },
  });

export class CreateInterviewEvaluationDto extends createZodDto(
  createInterviewEvaluationSchema,
) {}

export const sendEmailToCandidatesSchema = z
  .object({
    candidate_ids: z.array(z.string().regex(UUID_REGEX)).min(1),
    subject: z.string().min(1),
    html: z.string().min(1),
    plain_text: z.string().min(1),
  })
  .meta({
    example: {
      candidate_ids: [
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        '5c9d6a2e-8b4f-4e1a-9c3d-7f2a1b6e4d8c',
      ],
      subject: 'Comunicado do processo seletivo',
      html: '<p>Olá, candidato!</p>',
      plain_text: 'Olá, candidato!',
    },
  });

export class SendEmailToCandidatesDto extends createZodDto(
  sendEmailToCandidatesSchema,
) {}

export interface SelectionProcessRow {
  id: string;
  title: string;
  starts_at: Date;
  ends_at: Date;
  created_at: Date;
}

export interface ApplicationRow {
  id: string;
  selection_process_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  instagram: string;
  how_heard: string;
  motivation: string;
  why_watt: string;
  shirt_size: (typeof SHIRT_SIZES)[number];
  resume_path: string;
  transcript_path: string;
  photo_path: string;
  status: (typeof APPLICATION_STATUSES)[number];
  created_at: Date;
}

export interface StageRow {
  id: string;
  selection_process_id: string;
  name: string;
  position: number;
  created_at: Date;
}

export interface CandidateRow {
  id: string;
  application_id: string;
  selection_process_id: string;
  current_stage_id: string;
  name: string;
  course: string;
  period: number;
  phone: string;
  email: string;
  photo_path: string;
  shirt_size: string;
  status: (typeof CANDIDATE_STATUSES)[number];
  created_at: Date;
}

export interface InterviewSlotRow {
  id: string;
  selection_process_id: string;
  consultant_id: string;
  starts_at: Date;
  ends_at: Date;
  booking_id: string | null;
  created_at: Date;
}

export interface InterviewBookingRow {
  id: string;
  selection_process_id: string;
  candidate_id: string;
  starts_at: Date;
  ends_at: Date;
  booked_at: Date;
  meet_link: string | null;
  created_at: Date;
}

export interface InterviewTokenRow {
  id: string;
  candidate_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface InterviewEvaluationRow {
  id: string;
  booking_id: string;
  evaluator_id: string;
  proatividade: number;
  lideranca: number;
  transparencia: number;
  uniao_de_time: number;
  comunicacao: number;
  seriedade: number;
  compromisso: number;
  proposito: number;
  autoresponsabilidade: number;
  autoconfianca: number;
  responsabilidade_social: number;
  criatividade: number;
  procrastinacao: boolean;
  desinteresse: boolean;
  falta_de_transparencia: boolean;
  proposito_vago: boolean;
  vitimizacao: boolean;
  falta_de_confianca: boolean;
  observacoes: string | null;
  created_at: Date;
}
