import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  ActivityFilters,
  ActivityResponse,
  ActivityRow,
  CreateActivityDto,
  UpdateActivityDto,
} from './dto/activity.dto';

function toResponse(row: ActivityRow): ActivityResponse {
  return {
    ...row,
    date:
      row.date instanceof Date
        ? row.date.toISOString().split('T')[0]
        : String(row.date),
    time_start: String(row.time_start).slice(0, 5),
    time_end: String(row.time_end).slice(0, 5),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const SELECT_FIELDS = `
  a.id, a.user_id, u.name AS user_name, a.name, a.description,
  a.date, a.time_start, a.time_end, a.priority, a.created_at, a.updated_at
`;

const ROLE_RANK_CASE = `
  CASE u.role
    WHEN 'consultor'  THEN 0
    WHEN 'gerente'    THEN 1
    WHEN 'diretor'    THEN 2
    WHEN 'assessor'   THEN 3
    WHEN 'presidente' THEN 4
    ELSE -1
  END
`;

@Injectable()
export class ActivitiesService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    dto: CreateActivityDto,
  ): Promise<ActivityResponse> {
    const result = await this.db.query<ActivityRow>(
      `INSERT INTO activities (user_id, name, description, date, time_start, time_end, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id, user_id,
         (SELECT name FROM users WHERE id = $1) AS user_name,
         name, description, date, time_start, time_end, priority, created_at, updated_at`,
      [
        userId,
        dto.name,
        dto.description ?? null,
        dto.date,
        dto.time_start,
        dto.time_end,
        dto.priority,
      ],
    );
    return toResponse(result.rows[0]);
  }

  async findAll(
    requesterId: string,
    requesterRank: number,
    requesterSector: string,
    filters: ActivityFilters,
  ): Promise<ActivityResponse[]> {
    const params: unknown[] = [requesterRank, requesterId, requesterSector];
    let dateClause = '';

    if (filters.date) {
      params.push(filters.date);
      dateClause = `AND a.date = $${params.length}`;
    } else {
      if (filters.from) {
        params.push(filters.from);
        dateClause += ` AND a.date >= $${params.length}`;
      }
      if (filters.to) {
        params.push(filters.to);
        dateClause += ` AND a.date <= $${params.length}`;
      }
    }

    let userClause = '';
    if (filters.userId) {
      params.push(filters.userId);
      userClause = `AND a.user_id = $${params.length}`;
    }

    const result = await this.db.query<ActivityRow>(
      `SELECT ${SELECT_FIELDS}
       FROM activities a
       JOIN users u ON u.id = a.user_id
       WHERE u.inactive = false
         AND (
           $1 >= 3
           OR a.user_id = $2
           OR (u.sector = $3 AND ${ROLE_RANK_CASE} < $1)
         )
         ${dateClause}
         ${userClause}
       ORDER BY a.date DESC, a.time_start ASC`,
      params,
    );

    return result.rows.map(toResponse);
  }

  async update(
    id: string,
    requesterId: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityResponse> {
    const found = await this.db.query<ActivityRow>(
      `SELECT a.id, a.user_id FROM activities a WHERE a.id = $1`,
      [id],
    );

    if (found.rows.length === 0) {
      throw new NotFoundException(`Activity with id ${id} not found`);
    }

    if (found.rows[0].user_id !== requesterId) {
      throw new ForbiddenException('You can only edit your own activities');
    }

    const fields = Object.keys(dto) as (keyof UpdateActivityDto)[];
    const setClauses = fields
      .map((f, i) => `${f as string} = $${i + 2}`)
      .join(', ');
    const values = fields.map((f) => dto[f] as unknown);

    const result = await this.db.query<ActivityRow>(
      `UPDATE activities SET ${setClauses}, updated_at = now()
       WHERE id = $1
       RETURNING
         id, user_id,
         (SELECT name FROM users WHERE id = user_id) AS user_name,
         name, description, date, time_start, time_end, priority, created_at, updated_at`,
      [id, ...values],
    );

    return toResponse(result.rows[0]);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const found = await this.db.query<ActivityRow>(
      `SELECT id, user_id FROM activities WHERE id = $1`,
      [id],
    );

    if (found.rows.length === 0) {
      throw new NotFoundException(`Activity with id ${id} not found`);
    }

    if (found.rows[0].user_id !== requesterId) {
      throw new ForbiddenException('You can only delete your own activities');
    }

    await this.db.query(`DELETE FROM activities WHERE id = $1`, [id]);
  }
}
