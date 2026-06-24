import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../../database/database.service';
import { EmailService } from '../email/email.service';
import { EnvService } from '../../config/env.service';
import { interviewBookingLinkEmail } from '../../common/email/InterviewBookingLinkEmail';
import { interviewConfirmationEmail } from '../../common/email/InterviewConfirmationEmail';
import { interviewConsultantEmail } from '../../common/email/InterviewConsultantEmail';
import { interviewMeetLinkEmail } from '../../common/email/InterviewMeetLinkEmail';
import { applicationConfirmationEmail } from '../../common/email/ApplicationConfirmationEmail';
import { applicationApprovalEmail } from '../../common/email/ApplicationApprovalEmail';
import { applicationRejectionEmail } from '../../common/email/ApplicationRejectionEmail';
import { candidateStageAdvancedEmail } from '../../common/email/CandidateStageAdvancedEmail';
import { candidateFinalApprovalEmail } from '../../common/email/CandidateFinalApprovalEmail';
import { candidateEliminatedEmail } from '../../common/email/CandidateEliminatedEmail';
import type {
  CreateProcessDto,
  UpdateProcessDto,
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  CreateStageDto,
  UpdateStageDto,
  UpdateCandidateStatusDto,
  SelectionProcessRow,
  ApplicationRow,
  StageRow,
  CandidateRow,
  SelectionProcessResponse,
  ApplicationResponse,
  ApplicationCreatedResponse,
  StageResponse,
  CandidateResponse,
  CreateInterviewSlotsDto,
  BookInterviewSlotDto,
  SendInterviewLinksDto,
  SendMeetLinkDto,
  CreateInterviewEvaluationDto,
  InterviewSlotRow,
  InterviewBookingRow,
  InterviewTokenRow,
  InterviewEvaluationRow,
  InterviewSlotResponse,
  AvailableTimeSlotResponse,
  InterviewBookingResponse,
  InterviewEvaluationResponse,
  InterviewEvaluationWithCandidateResponse,
  MySlotResponse,
  SendLinksResult,
} from './dto/selection-process.dto';

const BUCKET = 'selection-process-files';

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

@Injectable()
export class SelectionProcessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
    private readonly env: EnvService,
  ) {}

  // ─── Processes ────────────────────────────────────────────────────────────

  async createProcess(
    dto: CreateProcessDto,
  ): Promise<SelectionProcessResponse> {
    const { rows: overlap } = await this.db.query<{ id: string }>(
      `SELECT id FROM selection_processes
       WHERE tstzrange(starts_at, ends_at) && tstzrange($1::timestamptz, $2::timestamptz)`,
      [dto.starts_at, dto.ends_at],
    );
    if (overlap.length > 0) {
      throw new ConflictException(
        'A selection process already exists in this time range',
      );
    }

    const { rows } = await this.db.query<SelectionProcessRow>(
      `INSERT INTO selection_processes (title, starts_at, ends_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.title, dto.starts_at, dto.ends_at],
    );
    return this.toProcessResponse(rows[0]);
  }

  async findAll(): Promise<SelectionProcessResponse[]> {
    const { rows } = await this.db.query<SelectionProcessRow>(
      `SELECT * FROM selection_processes ORDER BY starts_at DESC`,
    );
    return rows.map((r) => this.toProcessResponse(r));
  }

  async updateProcess(
    processId: string,
    dto: UpdateProcessDto,
  ): Promise<SelectionProcessResponse> {
    const { rows: current } = await this.db.query<SelectionProcessRow>(
      `SELECT * FROM selection_processes WHERE id = $1`,
      [processId],
    );
    if (current.length === 0) {
      throw new NotFoundException(`Selection process ${processId} not found`);
    }

    const merged = {
      starts_at: dto.starts_at ?? current[0].starts_at.toISOString(),
      ends_at: dto.ends_at ?? current[0].ends_at.toISOString(),
    };

    if (new Date(merged.ends_at) <= new Date(merged.starts_at)) {
      throw new BadRequestException('ends_at must be after starts_at');
    }

    const { rows: overlap } = await this.db.query<{ id: string }>(
      `SELECT id FROM selection_processes
       WHERE id <> $1
         AND tstzrange(starts_at, ends_at) && tstzrange($2::timestamptz, $3::timestamptz)`,
      [processId, merged.starts_at, merged.ends_at],
    );
    if (overlap.length > 0) {
      throw new ConflictException(
        'A selection process already exists in this time range',
      );
    }

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.title !== undefined) {
      sets.push(`title = $${idx++}`);
      params.push(dto.title);
    }
    if (dto.starts_at !== undefined) {
      sets.push(`starts_at = $${idx++}`);
      params.push(dto.starts_at);
    }
    if (dto.ends_at !== undefined) {
      sets.push(`ends_at = $${idx++}`);
      params.push(dto.ends_at);
    }

    params.push(processId);
    const { rows } = await this.db.query<SelectionProcessRow>(
      `UPDATE selection_processes SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );
    return this.toProcessResponse(rows[0]);
  }

  private async findActive(): Promise<SelectionProcessRow | null> {
    const { rows } = await this.db.query<SelectionProcessRow>(
      `SELECT * FROM selection_processes
       WHERE NOW() BETWEEN starts_at AND ends_at
       ORDER BY starts_at DESC
       LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  // ─── Stages ───────────────────────────────────────────────────────────────

  async createStage(dto: CreateStageDto): Promise<StageResponse> {
    const { rows: processRows } = await this.db.query<{ id: string }>(
      `SELECT id FROM selection_processes WHERE id = $1`,
      [dto.selection_process_id],
    );
    if (processRows.length === 0) {
      throw new NotFoundException(
        `Selection process ${dto.selection_process_id} not found`,
      );
    }

    if (dto.shift) {
      // Shift all stages at position >= dto.position up by 1, then insert
      const row = await this.db.withTransaction(async (client: PoolClient) => {
        await client.query('SET CONSTRAINTS ALL DEFERRED');
        await client.query(
          `UPDATE selection_process_stages
           SET position = position + 1
           WHERE selection_process_id = $1 AND position >= $2`,
          [dto.selection_process_id, dto.position],
        );
        const result = await client.query<StageRow>(
          `INSERT INTO selection_process_stages (selection_process_id, name, position)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [dto.selection_process_id, dto.name, dto.position],
        );
        return result.rows[0];
      });
      return this.toStageResponse(row);
    }

    let rows: StageRow[];
    try {
      const result = await this.db.query<StageRow>(
        `INSERT INTO selection_process_stages (selection_process_id, name, position)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [dto.selection_process_id, dto.name, dto.position],
      );
      rows = result.rows;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          `A stage with position ${dto.position} already exists for this process`,
        );
      }
      throw err;
    }

    return this.toStageResponse(rows[0]);
  }

  async findStages(selectionProcessId?: string): Promise<StageResponse[]> {
    if (selectionProcessId !== undefined) {
      const { rows: processRows } = await this.db.query<{ id: string }>(
        `SELECT id FROM selection_processes WHERE id = $1`,
        [selectionProcessId],
      );
      if (processRows.length === 0) {
        throw new NotFoundException(
          `Selection process ${selectionProcessId} not found`,
        );
      }
    }

    const sql = selectionProcessId
      ? `SELECT * FROM selection_process_stages WHERE selection_process_id = $1 ORDER BY position ASC`
      : `SELECT * FROM selection_process_stages ORDER BY position ASC`;

    const params = selectionProcessId ? [selectionProcessId] : [];
    const { rows } = await this.db.query<StageRow>(sql, params);

    return rows.map((r) => this.toStageResponse(r));
  }

  async updateStage(
    stageId: string,
    dto: UpdateStageDto,
  ): Promise<StageResponse> {
    const { rows: current } = await this.db.query<StageRow>(
      `SELECT * FROM selection_process_stages WHERE id = $1`,
      [stageId],
    );
    if (current.length === 0) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }
    const stage = current[0];

    const newName = dto.name ?? stage.name;
    const newPosition = dto.position ?? stage.position;

    if (newPosition !== stage.position) {
      // Check if another stage occupies the target position
      const { rows: conflict } = await this.db.query<StageRow>(
        `SELECT * FROM selection_process_stages
         WHERE selection_process_id = $1 AND position = $2 AND id <> $3`,
        [stage.selection_process_id, newPosition, stageId],
      );

      if (conflict.length > 0) {
        // Swap positions atomically using the deferrable constraint
        await this.db.withTransaction(async (client: PoolClient) => {
          await client.query('SET CONSTRAINTS ALL DEFERRED');
          await client.query(
            `UPDATE selection_process_stages SET name = $1, position = $2 WHERE id = $3`,
            [newName, newPosition, stageId],
          );
          await client.query(
            `UPDATE selection_process_stages SET position = $1 WHERE id = $2`,
            [stage.position, conflict[0].id],
          );
        });
      } else {
        await this.db.query(
          `UPDATE selection_process_stages SET name = $1, position = $2 WHERE id = $3`,
          [newName, newPosition, stageId],
        );
      }
    } else {
      await this.db.query(
        `UPDATE selection_process_stages SET name = $1 WHERE id = $2`,
        [newName, stageId],
      );
    }

    const { rows: updated } = await this.db.query<StageRow>(
      `SELECT * FROM selection_process_stages WHERE id = $1`,
      [stageId],
    );
    return this.toStageResponse(updated[0]);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  async createApplication(
    dto: CreateApplicationDto,
  ): Promise<ApplicationCreatedResponse> {
    const activeProcess = await this.findActive();
    if (!activeProcess) {
      throw new NotFoundException('No active selection process found');
    }

    await this.validateFileExists(dto.resume_path, 'Currículo');
    await this.validateFileExists(dto.transcript_path, 'Histórico escolar');
    await this.validateFileExists(dto.photo_path, 'Foto pessoal');

    let insertedId: string;
    let insertedCreatedAt: Date;

    try {
      const { rows } = await this.db.query<{ id: string; created_at: Date }>(
        `INSERT INTO selection_process_applications
           (selection_process_id, name, course, period, phone, email, instagram,
            how_heard, motivation, why_watt, shirt_size,
            resume_path, transcript_path, photo_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, created_at`,
        [
          activeProcess.id,
          dto.name,
          dto.course,
          dto.period,
          dto.phone,
          dto.email,
          dto.instagram,
          dto.how_heard,
          dto.motivation,
          dto.why_watt,
          dto.shirt_size,
          dto.resume_path,
          dto.transcript_path,
          dto.photo_path,
        ],
      );
      insertedId = rows[0].id;
      insertedCreatedAt = rows[0].created_at;
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'An application with this email already exists for this process',
        );
      }
      throw err;
    }

    try {
      await this.emailService.send({
        to: dto.email,
        ...applicationConfirmationEmail({
          applicantName: dto.name,
          processTitle: activeProcess.title,
        }),
      });
    } catch {
      // best-effort
    }

    return { id: insertedId, created_at: insertedCreatedAt.toISOString() };
  }

  async findApplications(
    selectionProcessId?: string,
  ): Promise<ApplicationResponse[]> {
    if (selectionProcessId !== undefined) {
      const { rows: processRows } = await this.db.query<{ id: string }>(
        `SELECT id FROM selection_processes WHERE id = $1`,
        [selectionProcessId],
      );
      if (processRows.length === 0) {
        throw new NotFoundException(
          `Selection process ${selectionProcessId} not found`,
        );
      }
    }

    const sql = selectionProcessId
      ? `SELECT * FROM selection_process_applications WHERE selection_process_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM selection_process_applications ORDER BY created_at DESC`;

    const params = selectionProcessId ? [selectionProcessId] : [];
    const { rows } = await this.db.query<ApplicationRow>(sql, params);

    return Promise.all(rows.map((r) => this.toApplicationResponse(r)));
  }

  async updateApplicationStatus(
    applicationId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<ApplicationResponse> {
    const { rows: appRows } = await this.db.query<ApplicationRow>(
      `SELECT * FROM selection_process_applications WHERE id = $1`,
      [applicationId],
    );
    if (appRows.length === 0) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    const app = appRows[0];

    if (dto.status === 'approved') {
      const { rows: stageRows } = await this.db.query<
        StageRow & { process_title: string }
      >(
        `SELECT sps.*, sp.title AS process_title
         FROM selection_process_stages sps
         JOIN selection_processes sp ON sp.id = sps.selection_process_id
         WHERE sps.selection_process_id = $1 AND sps.position = 1`,
        [app.selection_process_id],
      );
      if (stageRows.length === 0) {
        throw new BadRequestException(
          'No stages found for this process. Create stages before approving applications.',
        );
      }
      const stage = stageRows[0];

      await this.db.query(
        `UPDATE selection_process_applications SET status = $1 WHERE id = $2`,
        [dto.status, applicationId],
      );

      try {
        await this.db.query(
          `INSERT INTO candidates
             (application_id, selection_process_id, current_stage_id,
              name, course, period, phone, email, photo_path, shirt_size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            app.id,
            app.selection_process_id,
            stage.id,
            app.name,
            app.course,
            app.period,
            app.phone,
            app.email,
            app.photo_path,
            app.shirt_size,
          ],
        );
      } catch (err: unknown) {
        if (isUniqueViolation(err)) {
          throw new ConflictException(
            'Candidate already exists for this application',
          );
        }
        throw err;
      }

      try {
        await this.emailService.send({
          to: app.email,
          ...applicationApprovalEmail({
            applicantName: app.name,
            processTitle: stage.process_title,
            stageName: stage.name,
          }),
        });
      } catch {
        // best-effort
      }
    } else if (dto.status === 'reproved') {
      await this.db.query(
        `UPDATE selection_process_applications SET status = $1 WHERE id = $2`,
        [dto.status, applicationId],
      );

      const { rows: processRows } = await this.db.query<{ title: string }>(
        `SELECT title FROM selection_processes WHERE id = $1`,
        [app.selection_process_id],
      );

      try {
        await this.emailService.send({
          to: app.email,
          ...applicationRejectionEmail({
            applicantName: app.name,
            processTitle: processRows[0]?.title ?? '',
          }),
        });
      } catch {
        // best-effort
      }
    } else {
      await this.db.query(
        `UPDATE selection_process_applications SET status = $1 WHERE id = $2`,
        [dto.status, applicationId],
      );
    }

    const { rows: updated } = await this.db.query<ApplicationRow>(
      `SELECT * FROM selection_process_applications WHERE id = $1`,
      [applicationId],
    );
    return this.toApplicationResponse(updated[0]);
  }

  // ─── Candidates ───────────────────────────────────────────────────────────

  async findCandidates(filters: {
    selectionProcessId?: string;
    stageId?: string;
  }): Promise<CandidateResponse[]> {
    if (filters.selectionProcessId !== undefined) {
      const { rows: processRows } = await this.db.query<{ id: string }>(
        `SELECT id FROM selection_processes WHERE id = $1`,
        [filters.selectionProcessId],
      );
      if (processRows.length === 0) {
        throw new NotFoundException(
          `Selection process ${filters.selectionProcessId} not found`,
        );
      }
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.selectionProcessId) {
      conditions.push(`selection_process_id = $${idx++}`);
      params.push(filters.selectionProcessId);
    }
    if (filters.stageId) {
      conditions.push(`current_stage_id = $${idx++}`);
      params.push(filters.stageId);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.db.query<CandidateRow>(
      `SELECT * FROM candidates ${where} ORDER BY created_at DESC`,
      params,
    );

    return Promise.all(rows.map((r) => this.toCandidateResponse(r)));
  }

  async updateCandidateStatus(
    candidateId: string,
    dto: UpdateCandidateStatusDto,
  ): Promise<CandidateResponse> {
    const { rows: candidateRows } = await this.db.query<
      CandidateRow & {
        current_stage_name: string;
        current_stage_position: number;
        process_title: string;
      }
    >(
      `SELECT c.*,
              sps.name AS current_stage_name,
              sps.position AS current_stage_position,
              sp.title AS process_title
       FROM candidates c
       JOIN selection_process_stages sps ON sps.id = c.current_stage_id
       JOIN selection_processes sp ON sp.id = c.selection_process_id
       WHERE c.id = $1`,
      [candidateId],
    );

    if (candidateRows.length === 0) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    const candidate = candidateRows[0];

    if (candidate.status === 'eliminated' || candidate.status === 'approved') {
      throw new ConflictException(
        `Candidate is already ${candidate.status} and cannot be updated`,
      );
    }

    if (dto.status === 'approved') {
      const { rows: nextStageRows } = await this.db.query<StageRow>(
        `SELECT * FROM selection_process_stages
         WHERE selection_process_id = $1 AND position = $2`,
        [candidate.selection_process_id, candidate.current_stage_position + 1],
      );

      if (nextStageRows.length > 0) {
        const nextStage = nextStageRows[0];
        await this.db.query(
          `UPDATE candidates SET current_stage_id = $1 WHERE id = $2`,
          [nextStage.id, candidateId],
        );

        try {
          await this.emailService.send({
            to: candidate.email,
            ...candidateStageAdvancedEmail({
              candidateName: candidate.name,
              currentStageName: candidate.current_stage_name,
              nextStageName: nextStage.name,
            }),
          });
        } catch {
          // best-effort
        }
      } else {
        await this.db.query(
          `UPDATE candidates SET status = 'approved' WHERE id = $1`,
          [candidateId],
        );

        try {
          await this.emailService.send({
            to: candidate.email,
            ...candidateFinalApprovalEmail({
              candidateName: candidate.name,
              processTitle: candidate.process_title,
            }),
          });
        } catch {
          // best-effort
        }
      }
    } else {
      await this.db.query(
        `UPDATE candidates SET status = 'eliminated' WHERE id = $1`,
        [candidateId],
      );

      try {
        await this.emailService.send({
          to: candidate.email,
          ...candidateEliminatedEmail({
            candidateName: candidate.name,
            stageName: candidate.current_stage_name,
            processTitle: candidate.process_title,
          }),
        });
      } catch {
        // best-effort
      }
    }

    const { rows: updated } = await this.db.query<CandidateRow>(
      `SELECT * FROM candidates WHERE id = $1`,
      [candidateId],
    );
    return this.toCandidateResponse(updated[0]);
  }

  // ─── Interviews ───────────────────────────────────────────────────────────

  async createInterviewSlots(
    consultantId: string,
    dto: CreateInterviewSlotsDto,
  ): Promise<InterviewSlotResponse[]> {
    const process = await this.findActive();
    if (!process)
      throw new NotFoundException('No active selection process found');

    const BRT_OFFSET = -3;

    for (const startsAtStr of dto.slots) {
      const startsAt = new Date(startsAtStr);

      if (startsAt <= new Date()) {
        throw new BadRequestException(
          `Slot ${startsAtStr} must be in the future`,
        );
      }

      if (startsAt.getUTCMinutes() !== 0 || startsAt.getUTCSeconds() !== 0) {
        throw new BadRequestException(
          `Slot ${startsAtStr} must be at a full hour`,
        );
      }

      const brtHour = (((startsAt.getUTCHours() + BRT_OFFSET) % 24) + 24) % 24;
      if (brtHour < 8 || brtHour > 19) {
        throw new BadRequestException(
          `Slot ${startsAtStr} must be between 08h and 19h BRT`,
        );
      }
    }

    const results: InterviewSlotRow[] = [];
    for (const startsAtStr of dto.slots) {
      const startsAt = new Date(startsAtStr);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

      const { rows } = await this.db.query<InterviewSlotRow>(
        `INSERT INTO psel_interview_slots (selection_process_id, consultant_id, starts_at, ends_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (consultant_id, starts_at) DO NOTHING
         RETURNING *`,
        [
          process.id,
          consultantId,
          startsAt.toISOString(),
          endsAt.toISOString(),
        ],
      );
      if (rows.length > 0) results.push(rows[0]);
    }

    return results.map((r) => this.toInterviewSlotResponse(r));
  }

  async findAvailableTimeSlots(): Promise<AvailableTimeSlotResponse[]> {
    const process = await this.findActive();
    if (!process) return [];

    const { rows } = await this.db.query<{ starts_at: Date; ends_at: Date }>(
      `SELECT starts_at, MAX(ends_at) AS ends_at
       FROM psel_interview_slots
       WHERE selection_process_id = $1
       GROUP BY starts_at
       HAVING COUNT(*) FILTER (WHERE booking_id IS NULL) >= 2
       ORDER BY starts_at ASC`,
      [process.id],
    );

    return rows.map((r) => ({
      starts_at: r.starts_at.toISOString(),
      ends_at: r.ends_at.toISOString(),
    }));
  }

  async bookInterviewSlot(
    dto: BookInterviewSlotDto,
  ): Promise<InterviewBookingResponse> {
    const { rows: tokenRows } = await this.db.query<InterviewTokenRow>(
      `SELECT * FROM psel_interview_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [dto.token],
    );
    if (tokenRows.length === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { candidate_id: candidateId } = tokenRows[0];

    const { rows: existingBookings } = await this.db.query<{ id: string }>(
      `SELECT id FROM psel_interview_bookings WHERE candidate_id = $1`,
      [candidateId],
    );
    if (existingBookings.length > 0) {
      throw new ConflictException(
        'Candidate already has an interview scheduled',
      );
    }

    const { rows: candidateRows } = await this.db.query<{
      email: string;
      name: string;
    }>(`SELECT email, name FROM candidates WHERE id = $1`, [candidateId]);

    const { booking, consultantIds } = await this.db.withTransaction(
      async (client: PoolClient) => {
        const { rows: slots } = await client.query<{
          id: string;
          selection_process_id: string;
          ends_at: Date;
          consultant_id: string;
        }>(
          `SELECT id, selection_process_id, ends_at, consultant_id
           FROM psel_interview_slots
           WHERE starts_at = $1 AND booking_id IS NULL
           FOR UPDATE`,
          [dto.starts_at],
        );

        if (slots.length < 2) {
          throw new ConflictException('Slot is no longer available');
        }

        const selected = [...slots].sort(() => Math.random() - 0.5).slice(0, 2);

        const { rows: bookingRows } = await client.query<InterviewBookingRow>(
          `INSERT INTO psel_interview_bookings
             (selection_process_id, candidate_id, starts_at, ends_at)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [
            slots[0].selection_process_id,
            candidateId,
            dto.starts_at,
            slots[0].ends_at.toISOString(),
          ],
        );

        await client.query(
          `UPDATE psel_interview_slots SET booking_id = $1
           WHERE id = ANY($2::uuid[])`,
          [bookingRows[0].id, selected.map((s) => s.id)],
        );

        return {
          booking: bookingRows[0],
          consultantIds: selected.map((s) => s.consultant_id),
        };
      },
    );

    const startsAt = new Date(dto.starts_at);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const BRT_OFFSET = -3;
    const brtStartHour =
      (((startsAt.getUTCHours() + BRT_OFFSET) % 24) + 24) % 24;
    const brtEndHour = (((endsAt.getUTCHours() + BRT_OFFSET) % 24) + 24) % 24;
    const pad = (n: number) => String(n).padStart(2, '0');
    const interviewDate = `${startsAt.getUTCDate().toString().padStart(2, '0')}/${(startsAt.getUTCMonth() + 1).toString().padStart(2, '0')}/${startsAt.getUTCFullYear()}`;
    const startTimeStr = `${pad(brtStartHour)}:00`;
    const endTimeStr = `${pad(brtEndHour)}:00`;

    if (candidateRows.length > 0) {
      const candidate = candidateRows[0];
      this.emailService
        .send({
          to: candidate.email,
          ...interviewConfirmationEmail({
            candidateName: candidate.name,
            interviewDate,
            interviewStartTime: startTimeStr,
            interviewEndTime: endTimeStr,
          }),
        })
        .catch(() => {});
    }

    const { rows: consultantRows } = await this.db.query<{
      id: string;
      email: string;
      name: string;
    }>(`SELECT id, email, name FROM users WHERE id = ANY($1::uuid[])`, [
      consultantIds,
    ]);

    const candidateName =
      candidateRows.length > 0 ? candidateRows[0].name : 'Candidato';

    for (const consultant of consultantRows) {
      this.emailService
        .send({
          to: consultant.email,
          ...interviewConsultantEmail({
            consultantName: consultant.name,
            candidateName,
            interviewDate,
            interviewStartTime: startTimeStr,
            interviewEndTime: endTimeStr,
          }),
        })
        .catch(() => {});

      this.db
        .query(
          `INSERT INTO notifications (user_id, title, description, origin)
           VALUES ($1, $2, $3, 'automatic')`,
          [
            consultant.id,
            'Nova entrevista agendada',
            `${candidateName} agendou uma entrevista com você para ${interviewDate} às ${startTimeStr} (BRT).`,
          ],
        )
        .catch(() => {});
    }

    return this.toInterviewBookingResponse(booking);
  }

  async getSlots(userId: string, userRole: string): Promise<MySlotResponse[]> {
    const isSuperuser = userRole === 'assessor' || userRole === 'presidente';

    type SlotJoinRow = InterviewSlotRow & {
      consultant_name: string | null;
      candidate_name: string | null;
      candidate_email: string | null;
      pair_name: string | null;
    };

    let rows: SlotJoinRow[];

    if (isSuperuser) {
      const result = await this.db.query<SlotJoinRow>(
        `SELECT s.*, u.name AS consultant_name,
                c.name AS candidate_name, c.email AS candidate_email,
                NULL::text AS pair_name
         FROM psel_interview_slots s
         JOIN users u ON s.consultant_id = u.id
         LEFT JOIN psel_interview_bookings b ON s.booking_id = b.id
         LEFT JOIN candidates c ON b.candidate_id = c.id
         ORDER BY s.starts_at ASC`,
      );
      rows = result.rows;
    } else {
      const result = await this.db.query<SlotJoinRow>(
        `SELECT s.*, 
                    u.name AS consultant_name,
                    c.name AS candidate_name, 
                    c.email AS candidate_email,
                    (SELECT u2.name
                      FROM psel_interview_slots s2
                      JOIN users u2 ON u2.id = s2.consultant_id
                      WHERE s2.booking_id = s.booking_id
                        AND s2.consultant_id != $1
                      LIMIT 1) AS pair_name
        FROM psel_interview_slots s
        LEFT JOIN users u ON s.consultant_id = u.id
        LEFT JOIN psel_interview_bookings b ON s.booking_id = b.id
        LEFT JOIN candidates c ON b.candidate_id = c.id
        WHERE s.consultant_id = $1
        ORDER BY s.starts_at ASC`,
        [userId],
      );
      rows = result.rows;
    }

    return rows.map((r) => this.toMySlotResponse(r, isSuperuser));
  }

  async sendInterviewLinks(
    dto: SendInterviewLinksDto,
  ): Promise<SendLinksResult[]> {
    const process = await this.findActive();
    if (!process)
      throw new NotFoundException('No active selection process found');

    const results: SendLinksResult[] = [];

    for (const candidateId of dto.candidate_ids) {
      const { rows: candidateRows } = await this.db.query<{
        id: string;
        email: string;
        name: string;
      }>(`SELECT id, email, name FROM candidates WHERE id = $1`, [candidateId]);
      if (candidateRows.length === 0) {
        throw new NotFoundException(`Candidate ${candidateId} not found`);
      }

      const candidate = candidateRows[0];
      const token = randomBytes(32).toString('hex');

      await this.db.query(
        `INSERT INTO psel_interview_tokens (candidate_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [candidateId, token, process.ends_at.toISOString()],
      );

      const frontendUrl = this.env.get('FRONTEND_URL');
      const bookingUrl = `${frontendUrl}/psel/entrevistas/${token}`;

      let success = true;
      try {
        await this.emailService.send({
          to: candidate.email,
          ...interviewBookingLinkEmail({
            candidateName: candidate.name,
            bookingUrl,
          }),
        });
      } catch {
        success = false;
      }

      results.push({ candidate_id: candidateId, success });
    }

    return results;
  }

  // ─── Interview finalization ───────────────────────────────────────────────

  private async assertConsultantLinked(
    bookingId: string,
    consultantId: string,
  ): Promise<void> {
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id FROM psel_interview_slots
       WHERE booking_id = $1 AND consultant_id = $2`,
      [bookingId, consultantId],
    );
    if (rows.length === 0) {
      throw new ForbiddenException(
        'You are not a consultant for this interview',
      );
    }
  }

  async sendMeetLink(
    dto: SendMeetLinkDto,
    consultantId: string,
  ): Promise<InterviewBookingResponse> {
    const { rows: bookingRows } = await this.db.query<InterviewBookingRow>(
      `SELECT * FROM psel_interview_bookings WHERE id = $1`,
      [dto.booking_id],
    );
    if (bookingRows.length === 0) {
      throw new NotFoundException(`Booking ${dto.booking_id} not found`);
    }

    await this.assertConsultantLinked(dto.booking_id, consultantId);

    const booking = bookingRows[0];
    if (booking.meet_link) {
      throw new ConflictException(
        'A meet link has already been sent for this interview',
      );
    }

    const { rows: updated } = await this.db.query<InterviewBookingRow>(
      `UPDATE psel_interview_bookings SET meet_link = $1 WHERE id = $2 RETURNING *`,
      [dto.meet_link, dto.booking_id],
    );

    const { rows: candidateRows } = await this.db.query<{
      email: string;
      name: string;
    }>(`SELECT email, name FROM candidates WHERE id = $1`, [
      booking.candidate_id,
    ]);

    if (candidateRows.length > 0) {
      this.emailService
        .send({
          to: candidateRows[0].email,
          ...interviewMeetLinkEmail({
            candidateName: candidateRows[0].name,
            meetLink: dto.meet_link,
          }),
        })
        .catch(() => {});
    }

    return this.toInterviewBookingResponse(updated[0]);
  }

  async createInterviewEvaluation(
    bookingId: string,
    dto: CreateInterviewEvaluationDto,
    evaluatorId: string,
  ): Promise<InterviewEvaluationResponse> {
    const { rows: bookingRows } = await this.db.query<{
      id: string;
      starts_at: Date;
    }>(`SELECT id, starts_at FROM psel_interview_bookings WHERE id = $1`, [
      bookingId,
    ]);
    if (bookingRows.length === 0) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (new Date() < bookingRows[0].starts_at) {
      throw new BadRequestException(
        'Evaluation can only be submitted after the interview has started',
      );
    }

    await this.assertConsultantLinked(bookingId, evaluatorId);

    const { rows: existing } = await this.db.query<{ id: string }>(
      `SELECT id FROM psel_interview_evaluations WHERE booking_id = $1`,
      [bookingId],
    );
    if (existing.length > 0) {
      throw new ConflictException(
        'An evaluation already exists for this interview',
      );
    }

    const { rows } = await this.db.query<InterviewEvaluationRow>(
      `INSERT INTO psel_interview_evaluations
         (booking_id, evaluator_id,
          proatividade, lideranca, transparencia, uniao_de_time,
          comunicacao, seriedade, compromisso, proposito,
          autoresponsabilidade, autoconfianca, responsabilidade_social, criatividade,
          procrastinacao, desinteresse, falta_de_transparencia,
          proposito_vago, vitimizacao, falta_de_confianca,
          observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [
        bookingId,
        evaluatorId,
        dto.proatividade,
        dto.lideranca,
        dto.transparencia,
        dto.uniao_de_time,
        dto.comunicacao,
        dto.seriedade,
        dto.compromisso,
        dto.proposito,
        dto.autoresponsabilidade,
        dto.autoconfianca,
        dto.responsabilidade_social,
        dto.criatividade,
        dto.procrastinacao,
        dto.desinteresse,
        dto.falta_de_transparencia,
        dto.proposito_vago,
        dto.vitimizacao,
        dto.falta_de_confianca,
        dto.observacoes ?? null,
      ],
    );

    return this.toInterviewEvaluationResponse(rows[0]);
  }

  async findInterviewEvaluations(
    selectionProcessId?: string,
  ): Promise<InterviewEvaluationWithCandidateResponse[]> {
    type EvaluationWithCandidate = InterviewEvaluationRow & {
      candidate_id: string;
      candidate_name: string;
    };

    const sql = selectionProcessId
      ? `SELECT e.*, c.id AS candidate_id, c.name AS candidate_name
         FROM psel_interview_evaluations e
         JOIN psel_interview_bookings b ON b.id = e.booking_id
         JOIN candidates c ON c.id = b.candidate_id
         WHERE b.selection_process_id = $1
         ORDER BY e.created_at DESC`
      : `SELECT e.*, c.id AS candidate_id, c.name AS candidate_name
         FROM psel_interview_evaluations e
         JOIN psel_interview_bookings b ON b.id = e.booking_id
         JOIN candidates c ON c.id = b.candidate_id
         ORDER BY e.created_at DESC`;

    const params = selectionProcessId ? [selectionProcessId] : [];
    const { rows } = await this.db.query<EvaluationWithCandidate>(sql, params);

    return rows.map((row) => ({
      ...this.toInterviewEvaluationResponse(row),
      candidate_id: row.candidate_id,
      candidate_name: row.candidate_name,
    }));
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async validateFileExists(path: string, label: string): Promise<void> {
    const parts = path.split('/');
    const filename = parts.pop()!;
    const dir = parts.join('/');
    const { data, error } = await this.db.client.storage
      .from(BUCKET)
      .list(dir, { search: filename });
    if (error || !data?.find((f) => f.name === filename)) {
      throw new BadRequestException(
        `Arquivo não encontrado no storage: ${label}`,
      );
    }
  }

  private async toApplicationResponse(
    row: ApplicationRow,
  ): Promise<ApplicationResponse> {
    const [resumeUrl, transcriptUrl, photoUrl] = await Promise.all([
      this.createSignedUrl(row.resume_path),
      this.createSignedUrl(row.transcript_path),
      this.createSignedUrl(row.photo_path),
    ]);

    return {
      id: row.id,
      selection_process_id: row.selection_process_id,
      name: row.name,
      course: row.course,
      period: row.period,
      phone: row.phone,
      email: row.email,
      instagram: row.instagram,
      how_heard: row.how_heard,
      motivation: row.motivation,
      why_watt: row.why_watt,
      shirt_size: row.shirt_size,
      status: row.status,
      resume_signed_url: resumeUrl,
      transcript_signed_url: transcriptUrl,
      photo_signed_url: photoUrl,
      created_at: row.created_at.toISOString(),
    };
  }

  private async toCandidateResponse(
    row: CandidateRow,
  ): Promise<CandidateResponse> {
    const photoUrl = await this.createSignedUrl(row.photo_path);
    return {
      id: row.id,
      application_id: row.application_id,
      selection_process_id: row.selection_process_id,
      current_stage_id: row.current_stage_id,
      name: row.name,
      course: row.course,
      period: row.period,
      phone: row.phone,
      email: row.email,
      photo_signed_url: photoUrl,
      shirt_size: row.shirt_size,
      status: row.status,
      created_at: row.created_at.toISOString(),
    };
  }

  private async createSignedUrl(path: string): Promise<string> {
    const { data } = await this.db.client.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  }

  private toProcessResponse(
    row: SelectionProcessRow,
  ): SelectionProcessResponse {
    return {
      id: row.id,
      title: row.title,
      starts_at: row.starts_at.toISOString(),
      ends_at: row.ends_at.toISOString(),
      created_at: row.created_at.toISOString(),
    };
  }

  private toStageResponse(row: StageRow): StageResponse {
    return {
      id: row.id,
      selection_process_id: row.selection_process_id,
      name: row.name,
      position: row.position,
      created_at: row.created_at.toISOString(),
    };
  }

  private toInterviewSlotResponse(
    row: InterviewSlotRow,
  ): InterviewSlotResponse {
    return {
      id: row.id,
      selection_process_id: row.selection_process_id,
      consultant_id: row.consultant_id,
      starts_at: row.starts_at.toISOString(),
      ends_at: row.ends_at.toISOString(),
      booking_id: row.booking_id,
      created_at: row.created_at.toISOString(),
    };
  }

  private toInterviewBookingResponse(
    row: InterviewBookingRow,
  ): InterviewBookingResponse {
    return {
      id: row.id,
      selection_process_id: row.selection_process_id,
      candidate_id: row.candidate_id,
      starts_at: row.starts_at.toISOString(),
      ends_at: row.ends_at.toISOString(),
      booked_at: row.booked_at.toISOString(),
      meet_link: row.meet_link,
      created_at: row.created_at.toISOString(),
    };
  }

  private toInterviewEvaluationResponse(
    row: InterviewEvaluationRow,
  ): InterviewEvaluationResponse {
    return {
      id: row.id,
      booking_id: row.booking_id,
      evaluator_id: row.evaluator_id,
      proatividade: row.proatividade,
      lideranca: row.lideranca,
      transparencia: row.transparencia,
      uniao_de_time: row.uniao_de_time,
      comunicacao: row.comunicacao,
      seriedade: row.seriedade,
      compromisso: row.compromisso,
      proposito: row.proposito,
      autoresponsabilidade: row.autoresponsabilidade,
      autoconfianca: row.autoconfianca,
      responsabilidade_social: row.responsabilidade_social,
      criatividade: row.criatividade,
      procrastinacao: row.procrastinacao,
      desinteresse: row.desinteresse,
      falta_de_transparencia: row.falta_de_transparencia,
      proposito_vago: row.proposito_vago,
      vitimizacao: row.vitimizacao,
      falta_de_confianca: row.falta_de_confianca,
      observacoes: row.observacoes,
      created_at: row.created_at.toISOString(),
    };
  }

  private toMySlotResponse(
    row: InterviewSlotRow & {
      consultant_name: string | null;
      candidate_name: string | null;
      candidate_email: string | null;
      pair_name: string | null;
    },
    isSuperuser: boolean,
  ): MySlotResponse {
    const base: MySlotResponse = {
      id: row.id,
      selection_process_id: row.selection_process_id,
      consultant_id: row.consultant_id,
      starts_at: row.starts_at.toISOString(),
      ends_at: row.ends_at.toISOString(),
      booking_id: row.booking_id,
      created_at: row.created_at.toISOString(),
      candidate_name: row.candidate_name,
      candidate_email: row.candidate_email,
      consultant_name: row.consultant_name ?? undefined,
    };
    if (!isSuperuser) {
      base.pair_name = row.pair_name;
    }
    return base;
  }
}
