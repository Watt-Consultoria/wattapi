import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateWalletAccountDto,
  UpdateWalletAccountDto,
  WalletAccountRow,
} from './dto/account.dto';
import type { WalletAccountResponse } from './dto/account.response.dto';

@Injectable()
export class WalletAccountsService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    dto: CreateWalletAccountDto,
  ): Promise<WalletAccountResponse> {
    const { rows } = await this.db.query<WalletAccountRow>(
      `INSERT INTO wallet_accounts (name, type, balance_cents, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [dto.name, dto.type, dto.balance_cents, userId],
    );
    return this.toResponse(rows[0]);
  }

  async update(
    id: string,
    dto: UpdateWalletAccountDto,
  ): Promise<WalletAccountResponse> {
    await this.findRowById(id);

    const { rows } = await this.db.query<WalletAccountRow>(
      `UPDATE wallet_accounts
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [dto.name ?? null, dto.type ?? null, id],
    );
    return this.toResponse(rows[0]);
  }

  async findAll(): Promise<WalletAccountResponse[]> {
    const { rows } = await this.db.query<WalletAccountRow>(
      `SELECT * FROM wallet_accounts ORDER BY created_at DESC`,
    );
    return rows.map((row) => this.toResponse(row));
  }

  async findById(id: string): Promise<WalletAccountResponse> {
    const row = await this.findRowById(id);
    return this.toResponse(row);
  }

  private async findRowById(id: string): Promise<WalletAccountRow> {
    const { rows } = await this.db.query<WalletAccountRow>(
      `SELECT * FROM wallet_accounts WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) {
      throw new NotFoundException(`Wallet account ${id} not found`);
    }
    return rows[0];
  }

  private toResponse(row: WalletAccountRow): WalletAccountResponse {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      balance_cents: row.balance_cents,
      created_by: row.created_by,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }
}
