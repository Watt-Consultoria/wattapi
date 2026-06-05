import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  HouseRow,
  HouseResponse,
  HouseMemberResponse,
} from './dto/house.dto';

interface HouseMemberRow {
  id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  house_id: string;
}

@Injectable()
export class HousesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<HouseResponse[]> {
    const { rows: houses } = await this.db.query<HouseRow>(
      `SELECT id, name FROM houses ORDER BY name`,
    );

    const { rows: scores } = await this.db.query<{
      house_id: string;
      total_points: string;
    }>(
      `SELECT s.house_id, COALESCE(SUM(t.points), 0)::int AS total_points
       FROM gamification_submissions s
       JOIN gamification_tasks t ON t.id = s.task_id
       JOIN gamification_cycles c ON c.id = s.cycle_id
       WHERE s.status = 'approved' AND c.ended_at IS NULL
       GROUP BY s.house_id`,
    );

    const scoreMap = new Map(
      scores.map((r) => [r.house_id, Number(r.total_points)]),
    );

    return houses.map((h) => ({
      id: h.id,
      name: h.name,
      total_points: scoreMap.get(h.id) ?? 0,
    }));
  }

  async findMembers(houseId: string): Promise<HouseMemberResponse[]> {
    const { rows: houses } = await this.db.query<{ id: string }>(
      `SELECT id FROM houses WHERE id = $1`,
      [houseId],
    );

    if (houses.length === 0) {
      throw new NotFoundException(`House ${houseId} not found`);
    }

    const { rows } = await this.db.query<HouseMemberRow>(
      `SELECT id, name, email, role, sector, house_id
       FROM users
       WHERE house_id = $1 AND inactive = false
       ORDER BY name`,
      [houseId],
    );

    return rows;
  }

  async assignHouse(
    userId: string,
    houseId: string | null,
  ): Promise<HouseMemberRow & { house_id: string | null }> {
    if (houseId !== null) {
      const { rows: houses } = await this.db.query<{ id: string }>(
        `SELECT id FROM houses WHERE id = $1`,
        [houseId],
      );
      if (houses.length === 0) {
        throw new NotFoundException(`House ${houseId} not found`);
      }
    }

    const { rows } = await this.db.query<
      HouseMemberRow & { cpf: string; created_at: Date; updated_at: Date }
    >(
      `UPDATE users SET house_id = $1, updated_at = now()
       WHERE id = $2 AND inactive = false
       RETURNING id, name, email, role, sector, house_id, cpf, created_at, updated_at`,
      [houseId, userId],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return rows[0];
  }
}
