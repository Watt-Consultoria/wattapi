import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CycleRow,
  CycleResponse,
  TaskRow,
  TaskResponse,
  SubmissionRow,
  SubmissionResponse,
  CreateCycleDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateSubmissionDto,
  ReviewSubmissionDto,
  LeaderboardEntry,
  PodiumEntry,
} from './dto/gamification.dto';

const BUCKET = 'gamification-proofs';

function cycleToResponse(row: CycleRow): CycleResponse {
  return {
    id: row.id,
    name: row.name,
    started_at: row.started_at.toISOString(),
    ended_at: row.ended_at ? row.ended_at.toISOString() : null,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
  };
}

function taskToResponse(row: TaskRow): TaskResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    points: row.points,
    is_active: row.is_active,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class GamificationService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Cycles ──────────────────────────────────────────────────────────────

  async createCycle(
    userId: string,
    dto: CreateCycleDto,
  ): Promise<CycleResponse> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM gamification_cycles WHERE ended_at IS NULL LIMIT 1`,
    );
    if (existing.rows.length > 0) {
      throw new ConflictException('An active cycle already exists');
    }

    const { rows } = await this.db.query<CycleRow>(
      `INSERT INTO gamification_cycles (name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [dto.name, userId],
    );
    return cycleToResponse(rows[0]);
  }

  async closeCycle(cycleId: string): Promise<CycleResponse> {
    const found = await this.db.query<CycleRow>(
      `SELECT * FROM gamification_cycles WHERE id = $1`,
      [cycleId],
    );
    if (found.rows.length === 0) {
      throw new NotFoundException(`Cycle ${cycleId} not found`);
    }
    if (found.rows[0].ended_at !== null) {
      throw new ConflictException('Cycle is already closed');
    }

    const pending = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM gamification_submissions
       WHERE cycle_id = $1 AND status = 'pending'`,
      [cycleId],
    );
    if (Number(pending.rows[0].count) > 0) {
      throw new ConflictException(
        'Cannot close cycle with pending submissions',
      );
    }

    const { rows } = await this.db.query<CycleRow>(
      `UPDATE gamification_cycles SET ended_at = now()
       WHERE id = $1
       RETURNING *`,
      [cycleId],
    );
    return cycleToResponse(rows[0]);
  }

  async getActiveCycle(): Promise<CycleResponse> {
    const { rows } = await this.db.query<CycleRow>(
      `SELECT * FROM gamification_cycles WHERE ended_at IS NULL LIMIT 1`,
    );
    if (rows.length === 0) {
      throw new NotFoundException('No active cycle');
    }
    return cycleToResponse(rows[0]);
  }

  async listCycles(): Promise<CycleResponse[]> {
    const { rows } = await this.db.query<CycleRow>(
      `SELECT * FROM gamification_cycles ORDER BY started_at DESC`,
    );
    return rows.map(cycleToResponse);
  }

  // ─── Tasks ───────────────────────────────────────────────────────────────

  async createTask(userId: string, dto: CreateTaskDto): Promise<TaskResponse> {
    const { rows } = await this.db.query<TaskRow>(
      `INSERT INTO gamification_tasks (title, description, points, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.title, dto.description, dto.points, userId],
    );
    return taskToResponse(rows[0]);
  }

  async updateTask(taskId: string, dto: UpdateTaskDto): Promise<TaskResponse> {
    const fields = Object.keys(dto) as (keyof UpdateTaskDto)[];
    if (fields.length === 0) {
      throw new BadRequestException('At least one field must be provided');
    }

    const setClauses = fields
      .map((f, i) => `${f as string} = $${i + 2}`)
      .join(', ');
    const values = fields.map((f) => dto[f] as unknown);

    const { rows } = await this.db.query<TaskRow>(
      `UPDATE gamification_tasks
       SET ${setClauses}, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [taskId, ...values],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return taskToResponse(rows[0]);
  }

  async listTasks(includeInactive: boolean): Promise<TaskResponse[]> {
    const where = includeInactive ? '' : `WHERE is_active = true`;
    const { rows } = await this.db.query<TaskRow>(
      `SELECT * FROM gamification_tasks ${where} ORDER BY created_at DESC`,
    );
    return rows.map(taskToResponse);
  }

  // ─── Submissions ─────────────────────────────────────────────────────────

  async createSubmission(
    userId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionResponse> {
    const userRows = await this.db.query<{ house_id: string | null }>(
      `SELECT house_id FROM users WHERE id = $1 AND inactive = false`,
      [userId],
    );
    if (userRows.rows.length === 0 || userRows.rows[0].house_id === null) {
      throw new BadRequestException('User is not assigned to a house');
    }
    const houseId = userRows.rows[0].house_id;

    const cycleRows = await this.db.query<{ id: string }>(
      `SELECT id FROM gamification_cycles WHERE ended_at IS NULL LIMIT 1`,
    );
    if (cycleRows.rows.length === 0) {
      throw new BadRequestException('No active cycle');
    }
    const cycleId = cycleRows.rows[0].id;

    const taskRows = await this.db.query<{ id: string; is_active: boolean }>(
      `SELECT id, is_active FROM gamification_tasks WHERE id = $1`,
      [dto.task_id],
    );
    if (taskRows.rows.length === 0) {
      throw new BadRequestException(`Task ${dto.task_id} not found`);
    }
    if (!taskRows.rows[0].is_active) {
      throw new BadRequestException('Task is not active');
    }

    const parts = dto.file_path.split('/');
    const filename = parts.pop()!;
    const dir = parts.join('/');
    const { data, error } = await this.db.client.storage
      .from(BUCKET)
      .list(dir, { search: filename });
    if (error || !data?.find((f) => f.name === filename)) {
      throw new BadRequestException(
        `File not found in storage: ${dto.file_path}`,
      );
    }

    const { rows } = await this.db.query<SubmissionRow>(
      `INSERT INTO gamification_submissions
         (task_id, user_id, house_id, cycle_id, description, file_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dto.task_id, userId, houseId, cycleId, dto.description, dto.file_path],
    );

    return this.toSubmissionResponse(rows[0]);
  }

  async listSubmissions(
    callerId: string,
    callerRole: string,
    status?: string,
    targetUserId?: string,
  ): Promise<SubmissionResponse[]> {
    const isSuperuser =
      callerRole === 'assessor' || callerRole === 'presidente';

    let whereClause = '';
    const params: unknown[] = [];

    if (!isSuperuser) {
      whereClause = `WHERE s.user_id = $1`;
      params.push(callerId);
    } else {
      const conditions: string[] = [];
      if (status) {
        params.push(status);
        conditions.push(`s.status = $${params.length}`);
      }
      if (targetUserId) {
        params.push(targetUserId);
        conditions.push(`s.user_id = $${params.length}`);
      }
      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }
    }

    const { rows } = await this.db.query<SubmissionRow>(
      `SELECT s.* FROM gamification_submissions s
       ${whereClause}
       ORDER BY s.created_at DESC`,
      params,
    );

    return Promise.all(rows.map((r) => this.toSubmissionResponse(r)));
  }

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    dto: ReviewSubmissionDto,
  ): Promise<SubmissionResponse> {
    const found = await this.db.query<SubmissionRow>(
      `SELECT * FROM gamification_submissions WHERE id = $1`,
      [submissionId],
    );
    if (found.rows.length === 0) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (found.rows[0].status !== 'pending') {
      throw new ConflictException('Submission is already reviewed');
    }

    const { rows } = await this.db.query<SubmissionRow>(
      `UPDATE gamification_submissions
       SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [dto.status, dto.rejection_reason ?? null, reviewerId, submissionId],
    );

    return this.toSubmissionResponse(rows[0]);
  }

  // ─── Leaderboard ─────────────────────────────────────────────────────────

  async getLeaderboard(cycleId?: string): Promise<LeaderboardEntry[]> {
    let resolvedCycleId = cycleId;

    if (!resolvedCycleId) {
      const { rows } = await this.db.query<{ id: string }>(
        `SELECT id FROM gamification_cycles WHERE ended_at IS NULL LIMIT 1`,
      );
      if (rows.length === 0) {
        throw new NotFoundException('No active cycle');
      }
      resolvedCycleId = rows[0].id;
    } else {
      const { rows } = await this.db.query<{ id: string }>(
        `SELECT id FROM gamification_cycles WHERE id = $1`,
        [resolvedCycleId],
      );
      if (rows.length === 0) {
        throw new NotFoundException(`Cycle ${resolvedCycleId} not found`);
      }
    }

    const { rows: houses } = await this.db.query<{ id: string; name: string }>(
      `SELECT id, name FROM houses ORDER BY name`,
    );

    const { rows: scores } = await this.db.query<{
      house_id: string;
      total_points: string;
    }>(
      `SELECT s.house_id, COALESCE(SUM(t.points), 0)::int AS total_points
       FROM gamification_submissions s
       JOIN gamification_tasks t ON t.id = s.task_id
       WHERE s.status = 'approved' AND s.cycle_id = $1
       GROUP BY s.house_id`,
      [resolvedCycleId],
    );

    const scoreMap = new Map(
      scores.map((r) => [r.house_id, Number(r.total_points)]),
    );

    return houses
      .map((h) => ({
        house_id: h.id,
        house_name: h.name,
        total_points: scoreMap.get(h.id) ?? 0,
      }))
      .sort((a, b) => b.total_points - a.total_points);
  }

  async getPodium(houseId: string, cycleId?: string): Promise<PodiumEntry[]> {
    let resolvedCycleId = cycleId;

    if (!resolvedCycleId) {
      const { rows } = await this.db.query<{ id: string }>(
        `SELECT id FROM gamification_cycles WHERE ended_at IS NULL LIMIT 1`,
      );
      if (rows.length === 0) {
        throw new NotFoundException('No active cycle');
      }
      resolvedCycleId = rows[0].id;
    }

    const { rows } = await this.db.query<{
      user_id: string;
      user_name: string;
      points_contributed: string;
      approved_count: string;
    }>(
      `SELECT s.user_id, u.name AS user_name,
              COALESCE(SUM(t.points), 0)::int AS points_contributed,
              COUNT(s.id)::int AS approved_count
       FROM gamification_submissions s
       JOIN gamification_tasks t ON t.id = s.task_id
       JOIN users u ON u.id = s.user_id
       WHERE s.status = 'approved'
         AND s.cycle_id = $1
         AND s.house_id = $2
       GROUP BY s.user_id, u.name
       ORDER BY points_contributed DESC`,
      [resolvedCycleId, houseId],
    );

    return rows.map((r) => ({
      user_id: r.user_id,
      user_name: r.user_name,
      points_contributed: Number(r.points_contributed),
      approved_count: Number(r.approved_count),
    }));
  }

  private async toSubmissionResponse(
    row: SubmissionRow,
  ): Promise<SubmissionResponse> {
    const { data } = await this.db.client.storage
      .from(BUCKET)
      .createSignedUrl(row.file_path, 3600);

    return {
      id: row.id,
      task_id: row.task_id,
      user_id: row.user_id,
      house_id: row.house_id,
      cycle_id: row.cycle_id,
      description: row.description,
      file_url: data?.signedUrl ?? '',
      status: row.status,
      rejection_reason: row.rejection_reason,
      reviewed_by: row.reviewed_by,
      reviewed_at: row.reviewed_at ? row.reviewed_at.toISOString() : null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
