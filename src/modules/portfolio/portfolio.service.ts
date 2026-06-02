import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CreatePortfolioItemDto,
  UpdatePortfolioItemDto,
  PortfolioItemRow,
  PortfolioItemResponse,
} from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<PortfolioItemResponse[]> {
    const { rows } = await this.db.query<PortfolioItemRow>(
      `SELECT * FROM portfolio_items ORDER BY name`,
    );
    return rows.map((row) => this.toResponse(row));
  }

  async create(dto: CreatePortfolioItemDto): Promise<PortfolioItemResponse> {
    try {
      const { rows } = await this.db.query<PortfolioItemRow>(
        `INSERT INTO portfolio_items (name, description)
         VALUES ($1, $2)
         RETURNING *`,
        [dto.name, dto.description ?? null],
      );
      return this.toResponse(rows[0]);
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictException(
          `Portfolio item with name "${dto.name}" already exists`,
        );
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdatePortfolioItemDto,
  ): Promise<PortfolioItemResponse> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      sets.push(`name = $${idx++}`);
      params.push(dto.name);
    }
    if (dto.description !== undefined) {
      sets.push(`description = $${idx++}`);
      params.push(dto.description);
    }
    sets.push(`updated_at = now()`);
    params.push(id);

    const { rows } = await this.db.query<PortfolioItemRow>(
      `UPDATE portfolio_items SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params,
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Portfolio item ${id} not found`);
    }
    return this.toResponse(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const { rowCount } = await this.db.query(
      `DELETE FROM portfolio_items WHERE id = $1`,
      [id],
    );
    if (rowCount === 0) {
      throw new NotFoundException(`Portfolio item ${id} not found`);
    }
  }

  private toResponse(row: PortfolioItemRow): PortfolioItemResponse {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
