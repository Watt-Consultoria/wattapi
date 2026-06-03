import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateNormDto,
  NormResponse,
  NormRow,
  UpdateNormDto,
} from './dto/norm.dto';

type PgError = { code?: string };

function toResponse(row: NormRow): NormResponse {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    severity: row.severity,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

const SELECT_FIELDS = 'id, code, description, severity, created_at, updated_at';

@Injectable()
export class NormsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<NormResponse[]> {
    const result = await this.db.query<NormRow>(
      `SELECT ${SELECT_FIELDS} FROM company_norms ORDER BY code`,
    );
    return result.rows.map(toResponse);
  }

  async create(dto: CreateNormDto): Promise<NormResponse> {
    try {
      const result = await this.db.query<NormRow>(
        `INSERT INTO company_norms (code, description, severity)
         VALUES ($1, $2, $3)
         RETURNING ${SELECT_FIELDS}`,
        [dto.code, dto.description, dto.severity],
      );
      return toResponse(result.rows[0]);
    } catch (err) {
      if ((err as PgError)?.code === '23505') {
        throw new ConflictException(
          `A norm with code "${dto.code}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateNormDto): Promise<NormResponse> {
    const allowed: readonly string[] = ['description', 'severity'];
    const fields = (Object.keys(dto) as (keyof UpdateNormDto)[]).filter((k) =>
      allowed.includes(k),
    );

    if (fields.length === 0) {
      return this.findOne(id);
    }

    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => dto[f]);

    const result = await this.db.query<NormRow>(
      `UPDATE company_norms SET ${setClauses}, updated_at = now()
       WHERE id = $1
       RETURNING ${SELECT_FIELDS}`,
      [id, ...values],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`Norm with id ${id} not found`);
    }

    return toResponse(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.db.query(
        `DELETE FROM company_norms WHERE id = $1`,
        [id],
      );
      if (result.rowCount === 0) {
        throw new NotFoundException(`Norm with id ${id} not found`);
      }
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if ((err as PgError)?.code === '23503') {
        throw new ConflictException(
          'Cannot delete norm with existing violations referencing it',
        );
      }
      throw err;
    }
  }

  async findOne(id: string): Promise<NormResponse> {
    const result = await this.db.query<NormRow>(
      `SELECT ${SELECT_FIELDS} FROM company_norms WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Norm with id ${id} not found`);
    }
    return toResponse(result.rows[0]);
  }
}
