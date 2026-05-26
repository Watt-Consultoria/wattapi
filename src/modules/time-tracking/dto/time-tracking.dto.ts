import { ApiProperty } from '@nestjs/swagger';

export class ClockInResponseSchema {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: '2026-05-25T14:30:00.000Z', format: 'date-time' })
  clocked_in_at: string;
}

export class ClockOutValidResponseSchema {
  @ApiProperty({ enum: ['valid'], example: 'valid' })
  status: 'valid';

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: '2026-05-25T14:30:00.000Z', format: 'date-time' })
  clocked_in_at: string;

  @ApiProperty({ example: '2026-05-25T22:30:00.000Z', format: 'date-time' })
  clocked_out_at: string;

  @ApiProperty({ example: 480, description: 'Duração em minutos' })
  duration_minutes: number;
}

export class ClockOutAnnulledResponseSchema {
  @ApiProperty({ enum: ['annulled'], example: 'annulled' })
  status: 'annulled';

  @ApiProperty({ enum: ['exceeded_max_duration'] })
  reason: 'exceeded_max_duration';

  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: '2026-05-25T14:30:00.000Z', format: 'date-time' })
  clocked_in_at: string;

  @ApiProperty({ example: '2026-05-25T23:30:00.000Z', format: 'date-time' })
  clocked_out_at: string;

  @ApiProperty({ example: 540 })
  duration_minutes: number;
}

export class ValidSessionSchema {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({ example: '2026-05-19T09:00:00.000Z', format: 'date-time' })
  clocked_in_at: string;

  @ApiProperty({ example: '2026-05-19T17:00:00.000Z', format: 'date-time' })
  clocked_out_at: string;

  @ApiProperty({ example: 480 })
  duration_minutes: number;
}

export class SummaryResponseSchema {
  @ApiProperty({
    example: '2026-05-19',
    description: 'Segunda-feira da semana atual',
  })
  week_start: string;

  @ApiProperty({
    example: '2026-05-25',
    description: 'Domingo da semana atual',
  })
  week_end: string;

  @ApiProperty({ example: 480 })
  total_minutes: number;

  @ApiProperty({ example: true })
  min_hours_met: boolean;

  @ApiProperty({ type: [ValidSessionSchema] })
  valid_sessions: ValidSessionSchema[];

  @ApiProperty({
    description: 'Sessão atual: none | open | invalid',
    example: { status: 'none' },
  })
  current_session: object;
}

export class MemberWeeklySummarySchema {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  user_id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: 480 })
  total_minutes: number;

  @ApiProperty({ example: true })
  min_hours_met: boolean;
}

export class TimeEntriesListResponseSchema {
  @ApiProperty({ example: '2026-05-19' })
  week_start: string;

  @ApiProperty({ example: '2026-05-25' })
  week_end: string;

  @ApiProperty({ example: 40 })
  min_week_hours: number;

  @ApiProperty({ type: [MemberWeeklySummarySchema] })
  members: MemberWeeklySummarySchema[];
}

export interface ClockInResponse {
  id: string;
  clocked_in_at: string;
}

export interface ClockOutValidResponse {
  status: 'valid';
  id: string;
  clocked_in_at: string;
  clocked_out_at: string;
  duration_minutes: number;
}

export interface ClockOutAnnulledResponse {
  status: 'annulled';
  reason: 'exceeded_max_duration';
  id: string;
  clocked_in_at: string;
  clocked_out_at: string;
  duration_minutes: number;
}

export type ClockOutResponse = ClockOutValidResponse | ClockOutAnnulledResponse;

export type CurrentSessionNone = { status: 'none' };

export type CurrentSessionOpen = {
  status: 'open';
  clocked_in_at: string;
  elapsed_minutes: number;
};

export type CurrentSessionInvalid = {
  status: 'invalid';
  reason: 'exceeded_max_duration';
  clocked_in_at: string;
  elapsed_minutes: number;
};

export type CurrentSession =
  | CurrentSessionNone
  | CurrentSessionOpen
  | CurrentSessionInvalid;

export interface ValidSession {
  id: string;
  clocked_in_at: string;
  clocked_out_at: string;
  duration_minutes: number;
}

export interface SummaryResponse {
  week_start: string;
  week_end: string;
  total_minutes: number;
  min_hours_met: boolean;
  valid_sessions: ValidSession[];
  current_session: CurrentSession;
}

export interface MemberWeeklySummary {
  user_id: string;
  name: string;
  total_minutes: number;
  min_hours_met: boolean;
}

export interface TimeEntriesListResponse {
  week_start: string;
  week_end: string;
  min_week_hours: number;
  members: MemberWeeklySummary[];
}
