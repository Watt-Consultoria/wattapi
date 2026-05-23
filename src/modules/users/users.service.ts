import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: string;
  updated_at: string;
  inactive: boolean;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: Date;
  updated_at: Date;
  inactive: boolean;
}

function toResponse(row: UserRow): UserResponse {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

type PgError = { code?: string; detail?: string };

function throwPgError(err: unknown): never {
  if ((err as PgError)?.code === '23505') {
    const detail = (err as PgError)?.detail ?? '';
    const field = detail.includes('email') ? 'email' : 'cpf';
    throw new ConflictException(`A user with this ${field} already exists`);
  }
  throw err;
}

const SELECT_FIELDS =
  'id, email, name, role, sector, cpf, created_at, updated_at';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<UserResponse[]> {
    const result = await this.db.query<UserRow>(
      `SELECT ${SELECT_FIELDS} FROM users WHERE inactive = false ORDER BY created_at ASC`,
    );
    return result.rows.map(toResponse);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    try {
      const result = await this.db.query<UserRow>(
        `INSERT INTO users (email, name, role, sector, cpf) VALUES ($1, $2, $3, $4, $5) RETURNING ${SELECT_FIELDS}`,
        [dto.email, dto.name, dto.role, dto.sector, dto.cpf],
      );
      return toResponse(result.rows[0]);
    } catch (err) {
      return throwPgError(err);
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const fields = Object.keys(dto) as (keyof UpdateUserDto)[];
    const setClauses = fields
      .map((f, i) => `${f as string} = $${i + 2}`)
      .join(', ');
    const values = fields.map((f) => dto[f] as unknown);

    try {
      const result = await this.db.query<UserRow>(
        `UPDATE users SET ${setClauses}, updated_at = now() WHERE id = $1 AND inactive = false RETURNING ${SELECT_FIELDS}`,
        [id, ...values],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return toResponse(result.rows[0]);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      return throwPgError(err);
    }
  }

  async deactivate(id: string): Promise<void> {
    const result = await this.db.query(
      'UPDATE users SET inactive = true, updated_at = now() WHERE id = $1 AND inactive = false',
      [id],
    );

    if (result.rowCount === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async findOne(id: string): Promise<UserResponse> {
    const result = await this.db.query<UserRow>(
      `SELECT ${SELECT_FIELDS} FROM users WHERE id = $1 AND inactive = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return toResponse(result.rows[0]);
  }
}
