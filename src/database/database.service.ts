import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { Pool, QueryResult } from 'pg';
import { EnvService } from '../config/env.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: ReturnType<typeof createClient>;
  private readonly pool: Pool;

  constructor(private readonly env: EnvService) {
    this.client = createClient(
      this.env.get('SUPABASE_URL'),
      this.env.get('SUPABASE_ANON_KEY'),
    );
    this.pool = new Pool({ connectionString: this.env.get('DATABASE_URL') });
  }

  query<T extends object = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
