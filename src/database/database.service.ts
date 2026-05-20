import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { EnvService } from '../config/env.service';

@Injectable()
export class DatabaseService {
  readonly client: ReturnType<typeof createClient>;

  constructor(private readonly env: EnvService) {
    this.client = createClient(
      this.env.get('SUPABASE_URL'),
      this.env.get('SUPABASE_ANON_KEY'),
    );
  }
}
