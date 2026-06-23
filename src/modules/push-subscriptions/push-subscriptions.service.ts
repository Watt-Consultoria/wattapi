import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { CreatePushSubscriptionDto } from './dto/push-subscription.dto';

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  created_at: Date;
  deleted_at: Date | null;
}

@Injectable()
export class PushSubscriptionsService {
  constructor(private readonly db: DatabaseService) {}

  async register(
    userId: string,
    dto: CreatePushSubscriptionDto,
  ): Promise<{ id: string }> {
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM push_subscriptions
       WHERE user_id = $1 AND endpoint = $2 AND deleted_at IS NULL`,
      [userId, dto.endpoint],
    );

    if (existing.rows.length > 0) {
      throw new ConflictException(
        'Push subscription for this endpoint already exists',
      );
    }

    const result = await this.db.query<{ id: string }>(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, dto.endpoint, dto.p256dh, dto.auth],
    );

    return { id: result.rows[0].id };
  }

  async unregister(id: string, requesterId: string): Promise<void> {
    const found = await this.db.query<PushSubscriptionRow>(
      `SELECT id, user_id FROM push_subscriptions WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (found.rows.length === 0) {
      throw new NotFoundException(`Push subscription with id ${id} not found`);
    }

    if (found.rows[0].user_id !== requesterId) {
      throw new ForbiddenException(
        'You can only remove your own push subscriptions',
      );
    }

    await this.db.query(
      `UPDATE push_subscriptions SET deleted_at = now() WHERE id = $1`,
      [id],
    );
  }

  getVapidPublicKey(): { vapid_public_key: string } {
    const key = process.env.VAPID_PUBLIC_KEY ?? '';
    return { vapid_public_key: key };
  }
}
