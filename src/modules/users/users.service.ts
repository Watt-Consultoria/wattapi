import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateUserDto } from './dto/create-user.dto';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: string;
  updated_at: string;
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
}

function toResponse(row: UserRow): UserResponse {
  return {
    ...row,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<UserResponse[]> {
    const result = await this.db.query<UserRow>(
      'SELECT id, email, name, role, sector, cpf, created_at, updated_at FROM users ORDER BY created_at ASC',
    );
    return result.rows.map(toResponse);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    try {
      const result = await this.db.query<UserRow>(
        'INSERT INTO users (email, name, role, sector, cpf) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, sector, cpf, created_at, updated_at',
        [dto.email, dto.name, dto.role, dto.sector, dto.cpf],
      );
      return toResponse(result.rows[0]);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        const detail: string = (err as { detail?: string })?.detail ?? '';
        const field = detail.includes('email') ? 'email' : 'cpf';
        throw new ConflictException(`A user with this ${field} already exists`);
      }
      throw err;
    }
  }

  async findOne(id: string): Promise<UserResponse> {
    const result = await this.db.query<UserRow>(
      'SELECT id, email, name, role, sector, cpf, created_at, updated_at FROM users WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return toResponse(result.rows[0]);
  }
}
