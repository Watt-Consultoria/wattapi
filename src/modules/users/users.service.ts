import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

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
