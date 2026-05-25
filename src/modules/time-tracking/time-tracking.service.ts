import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SettingsService } from '../settings/settings.service';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import type {
  ClockInResponse,
  ClockOutResponse,
  CurrentSession,
  MemberWeeklySummary,
  SummaryResponse,
  TimeEntriesListResponse,
  ValidSession,
} from './dto/time-tracking.dto';

const MAX_DURATION_MINUTES = 480;

interface TimeEntryRow {
  id: string;
  user_id: string;
  clocked_in_at: Date;
  clocked_out_at: Date | null;
  is_valid: boolean | null;
  annulled_reason: string | null;
}

interface ValidEntryRow {
  id: string;
  clocked_in_at: Date;
  clocked_out_at: Date;
  duration_seconds: number;
}

function elapsedMinutes(from: Date): number {
  return Math.floor((Date.now() - from.getTime()) / 60000);
}

interface MemberRow {
  user_id: string;
  name: string;
  total_seconds: number;
}

@Injectable()
export class TimeTrackingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settingsService: SettingsService,
  ) {}

  async clockIn(userId: string): Promise<ClockInResponse> {
    const open = await this.db.query<TimeEntryRow>(
      `SELECT id FROM time_entries WHERE user_id = $1 AND clocked_out_at IS NULL`,
      [userId],
    );

    if (open.rows.length > 0) {
      throw new ConflictException(
        'Você já possui uma sessão de trabalho em aberto',
      );
    }

    const result = await this.db.query<{ id: string; clocked_in_at: Date }>(
      `INSERT INTO time_entries (user_id) VALUES ($1) RETURNING id, clocked_in_at`,
      [userId],
    );

    const row = result.rows[0];
    return { id: row.id, clocked_in_at: row.clocked_in_at.toISOString() };
  }

  async clockOut(userId: string): Promise<ClockOutResponse> {
    const open = await this.db.query<TimeEntryRow>(
      `SELECT id, clocked_in_at FROM time_entries WHERE user_id = $1 AND clocked_out_at IS NULL`,
      [userId],
    );

    if (open.rows.length === 0) {
      throw new ConflictException('Nenhuma sessão de trabalho em aberto');
    }

    const entry = open.rows[0];
    const elapsed = elapsedMinutes(entry.clocked_in_at);
    const exceeded = elapsed > MAX_DURATION_MINUTES;

    const updated = await this.db.query<TimeEntryRow>(
      `UPDATE time_entries
       SET clocked_out_at = now(),
           is_valid = $2,
           annulled_reason = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING id, clocked_in_at, clocked_out_at`,
      [entry.id, !exceeded, exceeded ? 'exceeded_max_duration' : null],
    );

    const row = updated.rows[0];
    const durationMinutes = Math.floor(
      (row.clocked_out_at!.getTime() - row.clocked_in_at.getTime()) / 60000,
    );

    if (exceeded) {
      return {
        status: 'annulled',
        reason: 'exceeded_max_duration',
        id: row.id,
        clocked_in_at: row.clocked_in_at.toISOString(),
        clocked_out_at: row.clocked_out_at!.toISOString(),
        duration_minutes: durationMinutes,
      };
    }

    return {
      status: 'valid',
      id: row.id,
      clocked_in_at: row.clocked_in_at.toISOString(),
      clocked_out_at: row.clocked_out_at!.toISOString(),
      duration_minutes: durationMinutes,
    };
  }

  async getSummary(
    requesterId: string,
    requesterRole: string,
    targetUserId: string,
  ): Promise<SummaryResponse> {
    if (requesterId !== targetUserId && !isSuperuser(requesterRole)) {
      throw new ForbiddenException(
        'Acesso negado: apenas superusuários podem ver o resumo de outros usuários',
      );
    }

    const weekStart = `date_trunc('week', now())`;
    const weekEnd = `date_trunc('week', now()) + interval '7 days'`;

    const sessionsResult = await this.db.query<ValidEntryRow>(
      `SELECT id,
              clocked_in_at,
              clocked_out_at,
              EXTRACT(EPOCH FROM (clocked_out_at - clocked_in_at))::int AS duration_seconds
       FROM time_entries
       WHERE user_id = $1
         AND is_valid = TRUE
         AND clocked_in_at >= ${weekStart}
         AND clocked_in_at < ${weekEnd}
       ORDER BY clocked_in_at ASC`,
      [targetUserId],
    );

    const validSessions: ValidSession[] = sessionsResult.rows.map((r) => ({
      id: r.id,
      clocked_in_at: r.clocked_in_at.toISOString(),
      clocked_out_at: r.clocked_out_at.toISOString(),
      duration_minutes: Math.floor(r.duration_seconds / 60),
    }));

    const totalMinutes = validSessions.reduce(
      (sum, s) => sum + s.duration_minutes,
      0,
    );

    const openResult = await this.db.query<TimeEntryRow>(
      `SELECT id, clocked_in_at FROM time_entries WHERE user_id = $1 AND clocked_out_at IS NULL`,
      [targetUserId],
    );

    let currentSession: CurrentSession;
    if (openResult.rows.length === 0) {
      currentSession = { status: 'none' };
    } else {
      const openEntry = openResult.rows[0];
      const elapsed = elapsedMinutes(openEntry.clocked_in_at);

      if (elapsed > MAX_DURATION_MINUTES) {
        currentSession = {
          status: 'invalid',
          reason: 'exceeded_max_duration',
          clocked_in_at: openEntry.clocked_in_at.toISOString(),
          elapsed_minutes: elapsed,
        };
      } else {
        currentSession = {
          status: 'open',
          clocked_in_at: openEntry.clocked_in_at.toISOString(),
          elapsed_minutes: elapsed,
        };
      }
    }

    const minWeekHours = this.settingsService.get('min_week_hours');
    const minHoursMet = totalMinutes >= minWeekHours * 60;

    const now = new Date();
    const weekStartDate = new Date(now);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    const day = weekStartDate.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() + diff);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

    return {
      week_start: weekStartDate.toISOString().split('T')[0],
      week_end: weekEndDate.toISOString().split('T')[0],
      total_minutes: totalMinutes,
      min_hours_met: minHoursMet,
      valid_sessions: validSessions,
      current_session: currentSession,
    };
  }

  async getWeeklySummaryList(
    weekOffset: number,
  ): Promise<TimeEntriesListResponse> {
    const weekStart = `date_trunc('week', now() - ($1 * interval '1 week'))`;
    const weekEnd = `date_trunc('week', now() - ($1 * interval '1 week')) + interval '7 days'`;

    const result = await this.db.query<MemberRow>(
      `SELECT u.id                                                        AS user_id,
              u.name,
              COALESCE(
                SUM(EXTRACT(EPOCH FROM (te.clocked_out_at - te.clocked_in_at))::int),
                0
              )                                                           AS total_seconds
       FROM users u
       LEFT JOIN time_entries te
              ON te.user_id = u.id
             AND te.is_valid = TRUE
             AND te.clocked_in_at >= ${weekStart}
             AND te.clocked_in_at <  ${weekEnd}
       WHERE u.inactive = FALSE
       GROUP BY u.id, u.name
       ORDER BY u.name ASC`,
      [weekOffset],
    );

    const minWeekHours = this.settingsService.get('min_week_hours');
    const minWeekMinutes = minWeekHours * 60;

    const members: MemberWeeklySummary[] = result.rows.map((r) => {
      const totalMinutes = Math.floor(r.total_seconds / 60);
      return {
        user_id: r.user_id,
        name: r.name,
        total_minutes: totalMinutes,
        min_hours_met: totalMinutes >= minWeekMinutes,
      };
    });

    // Compute week_start / week_end strings from the offset
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStartDate = new Date(now);
    weekStartDate.setUTCHours(0, 0, 0, 0);
    weekStartDate.setUTCDate(now.getUTCDate() + diffToMonday - weekOffset * 7);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 6);

    return {
      week_start: weekStartDate.toISOString().split('T')[0],
      week_end: weekEndDate.toISOString().split('T')[0],
      min_week_hours: minWeekHours,
      members,
    };
  }
}
