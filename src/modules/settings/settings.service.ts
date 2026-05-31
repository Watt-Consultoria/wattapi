import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { AppSettings, UpdateSettingsData } from './dto/settings.dto';

const ALLOWED_COLUMNS = new Set<keyof AppSettings>([
  'min_week_hours',
  'min_availability_hours',
]);

@Injectable()
export class SettingsService implements OnModuleInit {
  private cache: AppSettings = {
    min_week_hours: 40,
    min_availability_hours: 0,
  };

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    const result = await this.db.query<AppSettings>(
      'SELECT min_week_hours, min_availability_hours FROM app_settings WHERE id = TRUE',
    );
    this.cache = result.rows[0];
  }

  getAll(): AppSettings {
    return { ...this.cache };
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.cache[key];
  }

  async update(data: UpdateSettingsData): Promise<AppSettings> {
    const entries = (
      Object.entries(data) as [keyof AppSettings, unknown][]
    ).filter(([key, v]) => ALLOWED_COLUMNS.has(key) && v !== undefined);

    const setClauses = entries
      .map(([key], i) => `${key} = $${i + 1}`)
      .join(', ');
    const values = entries.map(([, v]) => v);

    await this.db.query(
      `UPDATE app_settings SET ${setClauses}, updated_at = now() WHERE id = TRUE`,
      values,
    );

    this.cache = { ...this.cache, ...data };
    return { ...this.cache };
  }
}
