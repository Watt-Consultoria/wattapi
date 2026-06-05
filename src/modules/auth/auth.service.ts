import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { UserResponse } from '../users/users.service';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  house_id: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async resolveUser(id: string): Promise<UserResponse> {
    const result = await this.db.query<UserRow>(
      `SELECT id, email, name, role, sector, cpf, house_id, created_at, updated_at
       FROM users WHERE id = $1 AND inactive = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not registered in the system');
    }

    const row = result.rows[0];
    return {
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  async getAuthEmail(id: string): Promise<string> {
    const result = await this.db.query<{ email: string }>(
      `SELECT email FROM auth.users WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException(
        'User not found in authentication system',
      );
    }

    return result.rows[0].email;
  }
}
