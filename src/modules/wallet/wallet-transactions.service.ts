import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateWalletTransactionDto,
  WalletTransactionListQuery,
  WalletTransactionRow,
} from './dto/transaction.dto';
import type { WalletTransactionResponse } from './dto/transaction.response.dto';

@Injectable()
export class WalletTransactionsService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    dto: CreateWalletTransactionDto,
  ): Promise<WalletTransactionResponse> {
    const row = await this.db.withTransaction(async (client) => {
      const account = await client.query(
        `SELECT id FROM wallet_accounts WHERE id = $1`,
        [dto.account_id],
      );
      if (account.rows.length === 0) {
        throw new NotFoundException(
          `Wallet account ${dto.account_id} not found`,
        );
      }

      const delta =
        dto.type === 'income' ? dto.amount_cents : -dto.amount_cents;

      const { rows } = await client.query<WalletTransactionRow>(
        `INSERT INTO wallet_transactions (account_id, type, amount_cents, category, description, transaction_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          dto.account_id,
          dto.type,
          dto.amount_cents,
          dto.category,
          dto.description,
          dto.transaction_date,
          userId,
        ],
      );

      await client.query(
        `UPDATE wallet_accounts SET balance_cents = balance_cents + $1, updated_at = now() WHERE id = $2`,
        [delta, dto.account_id],
      );

      return rows[0];
    });

    return this.toResponse(row);
  }

  async findAll(
    query: WalletTransactionListQuery,
  ): Promise<WalletTransactionResponse[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.account_id) {
      params.push(query.account_id);
      conditions.push(`account_id = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await this.db.query<WalletTransactionRow>(
      `SELECT * FROM wallet_transactions ${whereClause} ORDER BY transaction_date DESC, created_at DESC`,
      params,
    );
    return rows.map((row) => this.toResponse(row));
  }

  private toResponse(row: WalletTransactionRow): WalletTransactionResponse {
    const transactionDate =
      row.transaction_date instanceof Date
        ? row.transaction_date.toISOString().slice(0, 10)
        : row.transaction_date;

    return {
      id: row.id,
      account_id: row.account_id,
      type: row.type,
      amount_cents: row.amount_cents,
      category: row.category,
      description: row.description,
      transaction_date: transactionDate,
      created_by: row.created_by,
      created_at: row.created_at.toISOString(),
    };
  }
}
