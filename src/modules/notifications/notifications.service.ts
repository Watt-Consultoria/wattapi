import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  CreateNotificationDto,
  NotificationResponse,
  NotificationRow,
} from './dto/notification.dto';

function toResponse(row: NotificationRow): NotificationResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    origin: row.origin,
    sent_at: row.sent_at.toISOString(),
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(userId: string): Promise<NotificationResponse[]> {
    const result = await this.db.query<NotificationRow>(
      `SELECT id, user_id, title, description, origin, sent_at, created_by, created_at
       FROM notifications
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY sent_at DESC`,
      [userId],
    );
    return result.rows.map(toResponse);
  }

  async softDelete(id: string, requesterId: string): Promise<void> {
    const found = await this.db.query<NotificationRow>(
      `SELECT id, user_id FROM notifications WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (found.rows.length === 0) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    if (found.rows[0].user_id !== requesterId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    await this.db.query(
      `UPDATE notifications SET deleted_at = now() WHERE id = $1`,
      [id],
    );
  }

  async createDirected(
    requesterId: string,
    requesterRank: number,
    dto: CreateNotificationDto,
  ): Promise<{ count: number }> {
    if (requesterRank < 3) {
      throw new ForbiddenException(
        'Only superusers can create directed notifications',
      );
    }

    const params: unknown[] = [];
    const conditions: string[] = ['inactive = false'];

    if (dto.target.sector) {
      params.push(dto.target.sector);
      conditions.push(`sector = $${params.length}`);
    }

    if (dto.target.role) {
      params.push(dto.target.role);
      conditions.push(`role = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');
    const recipients = await this.db.query<{ id: string }>(
      `SELECT id FROM users WHERE ${whereClause}`,
      params,
    );

    if (recipients.rows.length === 0) {
      return { count: 0 };
    }

    const values = recipients.rows
      .map((_, i) => {
        const base = i * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, 'directed', $${base + 4})`;
      })
      .join(', ');

    const insertParams: unknown[] = [];
    for (const recipient of recipients.rows) {
      insertParams.push(
        recipient.id,
        dto.title,
        dto.description ?? null,
        requesterId,
      );
    }

    await this.db.query(
      `INSERT INTO notifications (user_id, title, description, origin, created_by)
       VALUES ${values}`,
      insertParams,
    );

    return { count: recipients.rows.length };
  }
}
