import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { isSuperuser } from '../../common/guards/role-hierarchy';
import type { UserResponse } from '../users/users.service';
import type {
  CreateReimbursementDto,
  UpdateReimbursementStatusDto,
  ReimbursementAttachmentRow,
  ReimbursementRow,
} from './dto/reimbursement.dto';
import type {
  ReimbursementResponse,
  ReimbursementAttachmentResponse,
} from './dto/reimbursement.response.dto';

const BUCKET = 'reimbursement-receipts';

type ReimbursementWithAttachments = ReimbursementRow & {
  attachments: ReimbursementAttachmentRow[];
};

type JoinRow = ReimbursementRow & {
  att_id: string | null;
  att_path: string | null;
  att_name: string | null;
  att_created_at: Date | null;
};

@Injectable()
export class ReimbursementsService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    dto: CreateReimbursementDto,
  ): Promise<ReimbursementResponse> {
    for (const att of dto.attachments) {
      const parts = att.path.split('/');
      const filename = parts.pop()!;
      const dir = parts.join('/');
      const { data, error } = await this.db.client.storage
        .from(BUCKET)
        .list(dir, { search: filename });
      if (error || !data?.find((f) => f.name === filename)) {
        throw new BadRequestException(
          `Comprovante não encontrado no storage: ${att.name}`,
        );
      }
    }

    const result = await this.db.withTransaction(async (client) => {
      const { rows } = await client.query<ReimbursementRow>(
        `INSERT INTO reimbursements (user_id, title, description, amount_cents, category, pix_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          dto.title,
          dto.description,
          dto.amount_cents,
          dto.category,
          dto.pix_key,
        ],
      );
      const reimbursement = rows[0];

      const attachments: ReimbursementAttachmentRow[] = [];
      for (const att of dto.attachments) {
        const { rows: attRows } =
          await client.query<ReimbursementAttachmentRow>(
            `INSERT INTO reimbursement_attachments (reimbursement_id, path, name)
           VALUES ($1, $2, $3)
           RETURNING *`,
            [reimbursement.id, att.path, att.name],
          );
        attachments.push(attRows[0]);
      }

      return { ...reimbursement, attachments };
    });

    const [response] = await this.withSignedUrls([result]);
    return response;
  }

  async findAll(
    caller: UserResponse,
    target: string,
  ): Promise<ReimbursementResponse[]> {
    if (target === 'all' && !isSuperuser(caller.role)) {
      throw new ForbiddenException();
    }

    if (target === 'all') {
      const rows = await this.queryWithAttachments('', []);
      return this.withSignedUrls(rows);
    }

    const rows = await this.queryWithAttachments('WHERE r.user_id = $1', [
      caller.id,
    ]);
    return this.withSignedUrls(rows);
  }

  async findByUser(
    caller: UserResponse,
    userId: string,
  ): Promise<ReimbursementResponse[]> {
    if (!isSuperuser(caller.role)) {
      throw new ForbiddenException();
    }

    const rows = await this.queryWithAttachments('WHERE r.user_id = $1', [
      userId,
    ]);
    return this.withSignedUrls(rows);
  }

  async updateStatus(
    id: string,
    approverId: string,
    dto: UpdateReimbursementStatusDto,
  ): Promise<ReimbursementResponse> {
    const found = await this.db.query<ReimbursementRow>(
      `SELECT * FROM reimbursements WHERE id = $1`,
      [id],
    );

    if (found.rows.length === 0) {
      throw new NotFoundException(`Reimbursement ${id} not found`);
    }

    const reimbursement = found.rows[0];

    if (reimbursement.status !== 'pending') {
      throw new BadRequestException('Reimbursement status is already resolved');
    }

    const updated = await this.db.withTransaction(async (client) => {
      let paidAmountCents: number | null = null;
      let partialReason: string | null = null;

      if (dto.status === 'approved') {
        const payout = dto.paid_amount_cents ?? reimbursement.amount_cents;

        if (payout <= 0 || payout > reimbursement.amount_cents) {
          throw new BadRequestException(
            'paid_amount_cents deve ser positivo e não pode exceder o valor solicitado',
          );
        }

        const isPartial = payout < reimbursement.amount_cents;
        if (isPartial && !dto.partial_reason) {
          throw new BadRequestException(
            'partial_reason é obrigatório quando o valor pago é menor que o valor solicitado',
          );
        }

        const account = await client.query(
          `SELECT id FROM wallet_accounts WHERE id = $1`,
          [dto.account_id],
        );
        if (account.rows.length === 0) {
          throw new NotFoundException(
            `Wallet account ${dto.account_id} not found`,
          );
        }

        paidAmountCents = payout;
        partialReason = dto.partial_reason ?? null;

        const description = `Reembolso: ${reimbursement.title}`;

        await client.query(
          `INSERT INTO wallet_transactions (account_id, type, amount_cents, category, description, transaction_date, created_by)
           VALUES ($1, 'expense', $2, $3, $4, CURRENT_DATE, $5)`,
          [
            dto.account_id,
            payout,
            reimbursement.category,
            description,
            approverId,
          ],
        );

        await client.query(
          `UPDATE wallet_accounts SET balance_cents = balance_cents - $1, updated_at = now() WHERE id = $2`,
          [payout, dto.account_id],
        );
      }

      const { rows } = await client.query<ReimbursementRow>(
        `UPDATE reimbursements
         SET status = $1, paid_amount_cents = $2, partial_reason = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [dto.status, paidAmountCents, partialReason, id],
      );
      return rows[0];
    });

    const attResult = await this.db.query<ReimbursementAttachmentRow>(
      `SELECT * FROM reimbursement_attachments WHERE reimbursement_id = $1`,
      [id],
    );

    const [response] = await this.withSignedUrls([
      { ...updated, attachments: attResult.rows },
    ]);
    return response;
  }

  private async queryWithAttachments(
    whereClause: string,
    params: unknown[],
  ): Promise<ReimbursementWithAttachments[]> {
    const sql = `
      SELECT
        r.id, r.user_id, r.title, r.description, r.amount_cents,
        r.category, r.pix_key, r.status, r.paid_amount_cents, r.partial_reason,
        r.created_at, r.updated_at,
        ra.id AS att_id, ra.path AS att_path, ra.name AS att_name,
        ra.created_at AS att_created_at
      FROM reimbursements r
      LEFT JOIN reimbursement_attachments ra ON ra.reimbursement_id = r.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `;

    const { rows } = await this.db.query<JoinRow>(sql, params);

    const map = new Map<string, ReimbursementWithAttachments>();
    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          description: row.description,
          amount_cents: row.amount_cents,
          category: row.category,
          pix_key: row.pix_key,
          status: row.status,
          paid_amount_cents: row.paid_amount_cents,
          partial_reason: row.partial_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          attachments: [],
        });
      }
      if (row.att_id) {
        map.get(row.id)!.attachments.push({
          id: row.att_id,
          reimbursement_id: row.id,
          path: row.att_path!,
          name: row.att_name!,
          created_at: row.att_created_at!,
        });
      }
    }

    return [...map.values()];
  }

  private async withSignedUrls(
    reimbursements: ReimbursementWithAttachments[],
  ): Promise<ReimbursementResponse[]> {
    return Promise.all(
      reimbursements.map(async (r) => {
        const attachments: ReimbursementAttachmentResponse[] =
          await Promise.all(
            r.attachments.map(async (att) => {
              const { data } = await this.db.client.storage
                .from(BUCKET)
                .createSignedUrl(att.path, 3600);
              return {
                id: att.id,
                name: att.name,
                signed_url: data?.signedUrl ?? '',
              };
            }),
          );
        return {
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          description: r.description,
          amount_cents: r.amount_cents,
          category: r.category,
          pix_key: r.pix_key,
          status: r.status,
          paid_amount_cents: r.paid_amount_cents,
          partial_reason: r.partial_reason,
          attachments,
          created_at: r.created_at.toISOString(),
          updated_at: r.updated_at.toISOString(),
        };
      }),
    );
  }
}
