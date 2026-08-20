import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { CreateHeroDto, UpdateHeroDto, HeroRow } from './dto/hero.dto';
import type { HeroResponse } from './dto/hero.response.dto';

const BUCKET = 'hero-photos';

interface JoinRow extends HeroRow {
  user_name: string;
  user_role: string;
}

interface CandidateUser {
  id: string;
  inactive: boolean;
}

@Injectable()
export class HeroesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateHeroDto): Promise<HeroResponse> {
    const { rows: userRows } = await this.db.query<CandidateUser>(
      `SELECT id, inactive FROM users WHERE id = $1`,
      [dto.user_id],
    );

    if (userRows.length === 0) {
      throw new NotFoundException(`User with id ${dto.user_id} not found`);
    }

    if (!userRows[0].inactive) {
      throw new BadRequestException(
        'Referenced user is not marked as inactive',
      );
    }

    const { rows: existingHero } = await this.db.query<{ id: string }>(
      `SELECT id FROM heroes WHERE user_id = $1`,
      [dto.user_id],
    );
    if (existingHero.length > 0) {
      throw new ConflictException(
        `User with id ${dto.user_id} already has a hero`,
      );
    }

    if (dto.start_year > dto.end_year) {
      throw new BadRequestException('start_year must be <= end_year');
    }

    await this.assertPhotoExists(dto.photo_path);

    const { rows } = await this.db.query<HeroRow>(
      `INSERT INTO heroes (user_id, phrase, contributions, start_year, end_year, photo_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        dto.user_id,
        dto.phrase,
        dto.contributions.join(', '),
        dto.start_year,
        dto.end_year,
        dto.photo_path,
      ],
    );

    return this.findOne(rows[0].id);
  }

  async findAll(): Promise<HeroResponse[]> {
    const { rows } = await this.db.query<JoinRow>(
      `SELECT h.*, u.name AS user_name, u.role AS user_role
       FROM heroes h
       JOIN users u ON u.id = h.user_id
       ORDER BY h.created_at DESC`,
    );

    return Promise.all(rows.map((row) => this.toResponse(row)));
  }

  async findOne(id: string): Promise<HeroResponse> {
    const { rows } = await this.db.query<JoinRow>(
      `SELECT h.*, u.name AS user_name, u.role AS user_role
       FROM heroes h
       JOIN users u ON u.id = h.user_id
       WHERE h.id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundException(`Hero with id ${id} not found`);
    }

    return this.toResponse(rows[0]);
  }

  async update(id: string, dto: UpdateHeroDto): Promise<HeroResponse> {
    const { rows: heroRows } = await this.db.query<HeroRow>(
      `SELECT * FROM heroes WHERE id = $1`,
      [id],
    );

    if (heroRows.length === 0) {
      throw new NotFoundException(`Hero with id ${id} not found`);
    }

    const current = heroRows[0];
    const nextStartYear = dto.start_year ?? current.start_year;
    const nextEndYear = dto.end_year ?? current.end_year;
    if (nextStartYear > nextEndYear) {
      throw new BadRequestException('start_year must be <= end_year');
    }

    if (dto.photo_path) {
      await this.assertPhotoExists(dto.photo_path);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (dto.phrase !== undefined) {
      fields.push(`phrase = $${++i}`);
      values.push(dto.phrase);
    }
    if (dto.contributions !== undefined) {
      fields.push(`contributions = $${++i}`);
      values.push(dto.contributions.join(', '));
    }
    if (dto.start_year !== undefined) {
      fields.push(`start_year = $${++i}`);
      values.push(dto.start_year);
    }
    if (dto.end_year !== undefined) {
      fields.push(`end_year = $${++i}`);
      values.push(dto.end_year);
    }
    if (dto.photo_path !== undefined) {
      fields.push(`photo_path = $${++i}`);
      values.push(dto.photo_path);
    }

    await this.db.query(
      `UPDATE heroes SET ${fields.join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...values],
    );

    return this.findOne(id);
  }

  private async assertPhotoExists(photoPath: string): Promise<void> {
    const parts = photoPath.split('/');
    const filename = parts.pop()!;
    const dir = parts.join('/');
    const { data, error } = await this.db.client.storage
      .from(BUCKET)
      .list(dir, { search: filename });

    if (error || !data?.find((f) => f.name === filename)) {
      throw new BadRequestException(
        `Foto não encontrada no storage: ${photoPath}`,
      );
    }
  }

  private async toResponse(row: JoinRow): Promise<HeroResponse> {
    const { data } = await this.db.client.storage
      .from(BUCKET)
      .createSignedUrl(row.photo_path, 3600);

    return {
      id: row.id,
      user_id: row.user_id,
      name: row.user_name,
      role: row.user_role,
      phrase: row.phrase,
      contributions: row.contributions.split(',').map((c) => c.trim()),
      start_year: row.start_year,
      end_year: row.end_year,
      photo_url: data?.signedUrl ?? '',
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
