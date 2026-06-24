import { Injectable, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SettingsService } from '../settings/settings.service';
import { EmailService } from '../email/email.service';
import { newViolationEmail } from '../../common/email/NewViolationEmail';
import type { NormSeverity } from '../norms/dto/norm.dto';

export type WeeklyJobResult = {
  week_start: string;
  users_checked: number;
  violations_applied: number;
};

export type DailyJobResult = {
  notifications_created: number;
};

interface ActiveUser {
  id: string;
  email: string;
  name: string;
  total_seconds: number;
}

interface NormRow {
  id: string;
  code: string;
  description: string;
  severity: NormSeverity;
}

@Injectable()
export class InternalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly emailService: EmailService,
  ) {}

  async checkWeeklyAbsence(): Promise<WeeklyJobResult> {
    const weekStartResult = await this.db.query<{ week_start: Date }>(
      `SELECT date_trunc('week', now() - interval '1 week')::date AS week_start`,
    );
    const weekStart = weekStartResult.rows[0].week_start;
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const alreadyRan = await this.db.query<{ id: string }>(
      `SELECT id FROM internal_job_runs
       WHERE job_name = 'weekly-job'
         AND date_trunc('week', ran_at) = date_trunc('week', now())`,
    );
    if (alreadyRan.rows.length > 0) {
      throw new ConflictException('Weekly job has already been run this week');
    }

    const minWeekHours = this.settingsService.get('min_week_hours');
    const minWeekMinutes = minWeekHours * 60;
    const halfMinutes = minWeekMinutes / 2;

    const normsResult = await this.db.query<NormRow>(
      `SELECT id, code, description, severity FROM company_norms WHERE code IN ('AN07', 'AN13')`,
    );
    const normMap = new Map(normsResult.rows.map((n) => [n.code, n]));
    const normAN07 = normMap.get('AN07');
    const normAN13 = normMap.get('AN13');

    const weekEnd = `date_trunc('week', now() - interval '1 week') + interval '7 days'`;
    const weekStartExpr = `date_trunc('week', now() - interval '1 week')`;

    const usersResult = await this.db.query<ActiveUser>(
      `SELECT u.id, u.email, u.name,
              COALESCE(
                SUM(EXTRACT(EPOCH FROM (te.clocked_out_at - te.clocked_in_at))::int),
                0
              ) AS total_seconds
       FROM users u
       LEFT JOIN time_entries te
              ON te.user_id = u.id
             AND te.is_valid = TRUE
             AND te.clocked_in_at >= ${weekStartExpr}
             AND te.clocked_in_at <  ${weekEnd}
       WHERE u.inactive = FALSE
       GROUP BY u.id, u.email, u.name`,
    );

    const activeUsers = usersResult.rows;
    let violationsApplied = 0;
    const SEVERITY_POINTS: Record<NormSeverity, number> = {
      leve: 1,
      moderada: 2,
      grave: 6,
      desligamento: 18,
    };

    for (const user of activeUsers) {
      const totalMinutes = Math.floor(user.total_seconds / 60);
      if (totalMinutes >= minWeekMinutes) continue;

      const norm =
        totalMinutes >= halfMinutes ? (normAN07 ?? null) : (normAN13 ?? null);
      if (!norm) continue;

      const summaryResult = await this.db.query<{
        severity: NormSeverity;
        count: string;
      }>(
        `SELECT cn.severity, COUNT(*) AS count
         FROM member_violations mv
         JOIN company_norms cn ON cn.id = mv.norm_id
         WHERE mv.user_id = $1 AND mv.cancelled_at IS NULL AND mv.expires_at > now()
         GROUP BY cn.severity`,
        [user.id],
      );
      const counts: Record<NormSeverity, number> = {
        leve: 0,
        moderada: 0,
        grave: 0,
        desligamento: 0,
      };
      for (const row of summaryResult.rows) {
        counts[row.severity] = parseInt(row.count, 10);
      }
      const currentScore =
        counts.leve * 1 +
        counts.moderada * 2 +
        counts.grave * 6 +
        counts.desligamento * 18;

      await this.db.query(
        `INSERT INTO member_violations (user_id, norm_id, applied_by, source, reason)
         VALUES ($1, $2, NULL, 'automatic', $3)`,
        [
          user.id,
          norm.id,
          `Ausência semanal automática — semana de ${weekStartStr}`,
        ],
      );
      violationsApplied++;

      void this.emailService.send({
        to: user.email,
        ...newViolationEmail({
          memberName: user.name,
          normCode: norm.code,
          normDescription: norm.description,
          severity: norm.severity,
          points: SEVERITY_POINTS[norm.severity],
          reason: `Ausência semanal automática — semana de ${weekStartStr}`,
          expiresAt: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          currentScore,
          atRisk: currentScore >= 18,
        }),
      });
    }

    await this.db.query(
      `INSERT INTO internal_job_runs (job_name) VALUES ('weekly-job')`,
    );

    return {
      week_start: weekStartStr,
      users_checked: activeUsers.length,
      violations_applied: violationsApplied,
    };
  }

  async checkDailyActivitiesAndSendNotifications(): Promise<DailyJobResult> {
    const alreadyRan = await this.db.query<{ id: string }>(
      `SELECT id FROM internal_job_runs
       WHERE job_name = 'daily-job'
         AND date_trunc('day', ran_at) = date_trunc('day', now())`,
    );
    if (alreadyRan.rows.length > 0) {
      throw new ConflictException('Daily job has already been run today');
    }

    const result = await this.db.query<{ count: string }>(
      `WITH inserted AS (
         INSERT INTO notifications (user_id, title, description, origin)
         SELECT
           user_id,
           'Atividade agendada para hoje: ' || name,
           description,
           'automatic'
         FROM activities
         WHERE date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
         RETURNING id
       )
       SELECT COUNT(*) AS count FROM inserted`,
    );

    const notificationsCreated = parseInt(result.rows[0].count, 10);

    await this.db.query(
      `INSERT INTO internal_job_runs (job_name) VALUES ('daily-job')`,
    );

    return { notifications_created: notificationsCreated };
  }
}
