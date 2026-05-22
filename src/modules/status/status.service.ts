import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface DatabaseStatus {
  max_connections: number;
  opened_connections: number;
}

export interface StatusResponse {
  updated_at: string;
  dependencies: {
    database: DatabaseStatus;
  };
}

@Injectable()
export class StatusService {
  constructor(private readonly db: DatabaseService) {}

  async getStatus(): Promise<StatusResponse> {
    try {
      const [maxConnResult, openedConnResult] = await Promise.all([
        this.db.query<{ max_connections: number }>(
          "SELECT setting::int AS max_connections FROM pg_settings WHERE name = 'max_connections'",
        ),
        this.db.query<{ opened_connections: number }>(
          'SELECT count(*)::int AS opened_connections FROM pg_stat_activity',
        ),
      ]);

      return {
        updated_at: new Date().toISOString(),
        dependencies: {
          database: {
            max_connections: maxConnResult.rows[0].max_connections,
            opened_connections: openedConnResult.rows[0].opened_connections,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching database stats:', error);
      throw new InternalServerErrorException('Failed to fetch database stats');
    }
  }
}
