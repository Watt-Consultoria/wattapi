import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { Pool, QueryResult } from 'pg';
import { EnvService } from '../config/env.service';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: ReturnType<typeof createClient>;
  private readonly pool: Pool;

  constructor(private readonly env: EnvService) {
    try {
      this.client = createClient(
        this.env.get('SUPABASE_URL'),
        this.env.get('SUPABASE_PUBLIC_KEY'),
      );
    } catch (error) {
      throw new Error(
        `Failed to initialize Supabase client: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

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
