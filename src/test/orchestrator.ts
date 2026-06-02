import * as path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import retry from 'async-retry';
import * as jwt from 'jsonwebtoken';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

config({
  path: path.resolve(__dirname, '../..', '.env.development'),
  quiet: true,
});

const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
  return process.env.DATABASE_URL;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: getDatabaseUrl() });
  return pool;
}

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not defined');
    supabase = createClient(url, key);
  }
  return supabase;
}

let cpfSequence = 10000;

function nextCpf(): string {
  return String(++cpfSequence).padStart(11, '0');
}

async function waitForAllServices(): Promise<void> {
  await retry(
    async () => {
      const response = await fetch('http://localhost:3001/status');
      if (response.status !== 200) throw new Error('Server not ready');
    },
    { retries: 100, maxTimeout: 1000 },
  );
}

async function clearDatabase(): Promise<void> {
  const p = getPool();
  await p.query('DELETE FROM notifications');
  await p.query('DELETE FROM activities');
  await p.query('DELETE FROM time_entries');
  await p.query('DELETE FROM routine_slots');
  await p.query('DELETE FROM reimbursements');
  await p.query('DELETE FROM users');
  await p.query('DELETE FROM auth.users');
}

export interface CreatedAuthUser {
  id: string;
  email: string;
  token: string;
}

async function createAuthOnlyUser(email: string): Promise<CreatedAuthUser> {
  const id = crypto.randomUUID();
  await getPool().query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [id, email],
  );
  const token = jwt.sign({ sub: id }, JWT_SECRET);
  return { id, email, token };
}

export interface CreatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  token: string;
}

async function createUser({
  username,
  email,
  role,
  sector = 'projetos',
}: {
  username: string;
  email: string;
  password: string;
  role: string;
  sector?: string;
}): Promise<CreatedUser> {
  const id = crypto.randomUUID();
  const p = getPool();

  await p.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
    [id, email],
  );

  const cpf = nextCpf();
  await p.query(
    `INSERT INTO users (id, email, name, role, sector, cpf) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, email, username, role, sector, cpf],
  );

  const token = jwt.sign({ sub: id }, JWT_SECRET);
  return { id, email, name: username, role, sector, cpf, token };
}

export interface CreatedActivity {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  date: string;
  time_start: string;
  time_end: string;
  priority: 'alta' | 'media' | 'baixa';
}

async function createActivity({
  user_id,
  name = 'Atividade de teste',
  description = null,
  date = '2026-01-15',
  time_start = '09:00',
  time_end = '10:00',
  priority = 'media',
}: {
  user_id: string;
  name?: string;
  description?: string | null;
  date?: string;
  time_start?: string;
  time_end?: string;
  priority?: 'alta' | 'media' | 'baixa';
}): Promise<CreatedActivity> {
  const { rows } = await getPool().query<CreatedActivity>(
    `INSERT INTO activities (user_id, name, description, date, time_start, time_end, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, user_id, name, description, to_char(date, 'YYYY-MM-DD') AS date,
               substr(time_start::text, 1, 5) AS time_start, substr(time_end::text, 1, 5) AS time_end, priority`,
    [user_id, name, description, date, time_start, time_end, priority],
  );
  return rows[0];
}

export interface CreatedNotification {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  origin: string;
  created_by: string | null;
}

async function createNotification({
  user_id,
  title = 'Notificação de teste',
  description = null,
  origin = 'directed',
  created_by = null,
}: {
  user_id: string;
  title?: string;
  description?: string | null;
  origin?: string;
  created_by?: string | null;
}): Promise<CreatedNotification> {
  const { rows } = await getPool().query<CreatedNotification>(
    `INSERT INTO notifications (user_id, title, description, origin, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, title, description, origin, created_by`,
    [user_id, title, description, origin, created_by],
  );
  return rows[0];
}

export interface CreatedRoutineSlot {
  user_id: string;
  day: number;
  hour: number;
}

async function createRoutineSlot({
  user_id,
  day = 0,
  hour = 9,
}: {
  user_id: string;
  day?: number;
  hour?: number;
}): Promise<CreatedRoutineSlot> {
  const { rows } = await getPool().query<CreatedRoutineSlot>(
    `INSERT INTO routine_slots (user_id, day, hour) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, day, hour) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING user_id, day, hour`,
    [user_id, day, hour],
  );
  return rows[0];
}

export interface CreatedTimeEntry {
  id: string;
  user_id: string;
}

async function createTimeEntry({
  user_id,
  clocked_in_at,
  clocked_out_at,
}: {
  user_id: string;
  clocked_in_at?: string;
  clocked_out_at?: string;
}): Promise<CreatedTimeEntry> {
  const inAt =
    clocked_in_at ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let row: CreatedTimeEntry;
  if (clocked_out_at !== undefined) {
    const { rows } = await getPool().query<CreatedTimeEntry>(
      `INSERT INTO time_entries (user_id, clocked_in_at, clocked_out_at, is_valid)
       VALUES ($1, $2, $3, true)
       RETURNING id, user_id`,
      [user_id, inAt, clocked_out_at],
    );
    row = rows[0];
  } else {
    const { rows } = await getPool().query<CreatedTimeEntry>(
      `INSERT INTO time_entries (user_id, clocked_in_at)
       VALUES ($1, $2)
       RETURNING id, user_id`,
      [user_id, inAt],
    );
    row = rows[0];
  }
  return row;
}

export interface CreatedReimbursement {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount_cents: number;
  category: string;
  pix_key: string;
  status: string;
}

async function createReimbursement({
  user_id,
  title = 'Reembolso de teste',
  description = 'Descrição de teste',
  amount_cents = 5000,
  category = 'outro',
  pix_key = '00000000000',
}: {
  user_id: string;
  title?: string;
  description?: string;
  amount_cents?: number;
  category?: string;
  pix_key?: string;
}): Promise<CreatedReimbursement> {
  const { rows } = await getPool().query<CreatedReimbursement>(
    `INSERT INTO reimbursements (user_id, title, description, amount_cents, category, pix_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, title, description, amount_cents, category, pix_key, status`,
    [user_id, title, description, amount_cents, category, pix_key],
  );
  return rows[0];
}

async function uploadFile(userId: string, filename: string): Promise<string> {
  const filePath = `receipts/${userId}/${filename}`;
  const { error } = await getSupabase()
    .storage.from('reimbursement-receipts')
    .upload(filePath, Buffer.from('comprovante de teste'), {
      upsert: true,
      contentType: 'text/plain',
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return filePath;
}

export default {
  waitForAllServices,
  database: {
    clear: clearDatabase,
    seed: {
      createUser,
      createAuthOnlyUser,
      createActivity,
      createNotification,
      createRoutineSlot,
      createTimeEntry,
      createReimbursement,
      uploadFile,
    },
  },
};
