import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SettingsService } from '../settings/settings.service';
import { getRank } from '../../common/guards/role-hierarchy';
import type { UserResponse } from '../users/users.service';
import type {
  DayKey,
  SlotRow,
  SlotsGrid,
  SummaryResponse,
  SummaryUserEntry,
} from './dto/routine.dto';

const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function slotsToDb(
  userId: string,
  slots: SlotsGrid,
): Array<[string, number, number]> {
  const pairs: Array<[string, number, number]> = [];
  for (let day = 0; day < DAY_KEYS.length; day++) {
    const hours = slots[DAY_KEYS[day]];
    for (let i = 0; i < hours.length; i++) {
      if (hours[i]) pairs.push([userId, day, 8 + i]);
    }
  }
  return pairs;
}

function dbToSlots(rows: SlotRow[]): SlotsGrid {
  const grid = Object.fromEntries(
    DAY_KEYS.map((k) => [k, Array(14).fill(false) as boolean[]]),
  ) as SlotsGrid;
  for (const { day, hour } of rows) {
    grid[DAY_KEYS[day]][hour - 8] = true;
  }
  return grid;
}

function canView(viewer: UserResponse, target: UserResponse): boolean {
  if (viewer.id === target.id) return true;
  const vRank = getRank(viewer.role);
  if (vRank >= 3) return true;
  const tRank = getRank(target.role);
  if (vRank <= tRank) return false;
  return viewer.sector === target.sector;
}

interface SubordinatesFilter {
  roles: string[];
  sector: string | null;
}

function buildSubordinatesFilter(viewer: UserResponse): SubordinatesFilter {
  const rank = getRank(viewer.role);
  const allSubRoles: string[] = [];
  if (rank > 0) allSubRoles.push('consultor');
  if (rank > 1) allSubRoles.push('gerente');
  if (rank > 2) allSubRoles.push('diretor');
  if (rank >= 3) {
    allSubRoles.push('assessor');
    allSubRoles.push('presidente');
  }
  return {
    roles: allSubRoles,
    sector: rank >= 3 ? null : viewer.sector,
  };
}

@Injectable()
export class RoutineService {
  constructor(
    private readonly db: DatabaseService,
    private readonly settings: SettingsService,
  ) {}

  async upsertRoutine(userId: string, slots: SlotsGrid): Promise<void> {
    const pairs = slotsToDb(userId, slots);

    const minHours = this.settings.get('min_availability_hours');
    if (minHours > 0 && pairs.length < minHours) {
      throw new BadRequestException(
        `Disponibilidade insuficiente: você configurou ${pairs.length}h de disponibilidade, mas o mínimo exigido é ${minHours}h. Adicione mais ${minHours - pairs.length}h de disponibilidade.`,
      );
    }

    await this.db.withTransaction(async (client) => {
      await client.query('DELETE FROM routine_slots WHERE user_id = $1', [
        userId,
      ]);

      if (pairs.length > 0) {
        const placeholders = pairs
          .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
          .join(', ');
        const values = pairs.flat();
        await client.query(
          `INSERT INTO routine_slots (user_id, day, hour) VALUES ${placeholders}`,
          values,
        );
      }
    });
  }

  async getOwnRoutine(userId: string): Promise<{ slots: SlotsGrid | null }> {
    const result = await this.db.query<SlotRow>(
      'SELECT day, hour FROM routine_slots WHERE user_id = $1 ORDER BY day, hour',
      [userId],
    );
    if (result.rows.length === 0) return { slots: null };
    return { slots: dbToSlots(result.rows) };
  }

  async getRoutineByUserId(
    viewer: UserResponse,
    targetId: string,
  ): Promise<{ slots: SlotsGrid | null }> {
    const targetResult = await this.db.query<UserResponse>(
      'SELECT id, email, name, role, sector, cpf, created_at, updated_at FROM users WHERE id = $1 AND inactive = false',
      [targetId],
    );

    if (targetResult.rows.length === 0) {
      throw new NotFoundException(`User with id ${targetId} not found`);
    }

    const target = targetResult.rows[0];

    if (!canView(viewer, target)) {
      throw new ForbiddenException(
        'You do not have permission to view this routine',
      );
    }

    const result = await this.db.query<SlotRow>(
      'SELECT day, hour FROM routine_slots WHERE user_id = $1 ORDER BY day, hour',
      [targetId],
    );
    if (result.rows.length === 0) return { slots: null };
    return { slots: dbToSlots(result.rows) };
  }

  async getSummary(viewer: UserResponse): Promise<SummaryResponse> {
    const filter = buildSubordinatesFilter(viewer);

    if (filter.roles.length === 0)
      return { availability: {}, unconfigured: [] };

    const params: unknown[] = [filter.roles];
    let sectorClause = '';
    if (filter.sector !== null) {
      params.push(filter.sector);
      sectorClause = `AND u.sector = $${params.length}`;
    }

    const [slotsResult, unconfiguredResult] = await Promise.all([
      this.db.query<SlotRow & SummaryUserEntry>(
        `SELECT rs.day, rs.hour, u.id, u.name, u.role, u.sector
         FROM routine_slots rs
         JOIN users u ON rs.user_id = u.id
         WHERE u.role = ANY($1::text[])
           AND u.inactive = false
           ${sectorClause}
         ORDER BY rs.day, rs.hour`,
        params,
      ),
      this.db.query<SummaryUserEntry>(
        `SELECT u.id, u.name, u.role, u.sector
         FROM users u
         WHERE u.role = ANY($1::text[])
           AND u.inactive = false
           ${sectorClause}
           AND NOT EXISTS (SELECT 1 FROM routine_slots rs WHERE rs.user_id = u.id)
         ORDER BY u.name`,
        params,
      ),
    ]);

    const availability: Partial<
      Record<DayKey, Record<string, SummaryUserEntry[]>>
    > = {};
    for (const row of slotsResult.rows) {
      const dayKey = DAY_KEYS[row.day];
      const hourKey = String(row.hour);
      if (!availability[dayKey]) availability[dayKey] = {};
      const daySlots = availability[dayKey];
      if (!daySlots) continue;
      if (!daySlots[hourKey]) daySlots[hourKey] = [];
      daySlots[hourKey].push({
        id: row.id,
        name: row.name,
        role: row.role,
        sector: row.sector,
      });
    }

    return { availability, unconfigured: unconfiguredResult.rows };
  }
}
