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

const emailHttpUrl = `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}`;

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
  await p.query('DELETE FROM lead_comments');
  await p.query('DELETE FROM lead_contacts');
  await p.query('DELETE FROM leads');
  await p.query('DELETE FROM portfolio_items');
  await p.query('DELETE FROM member_violations');
  await p.query('DELETE FROM company_norms');
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

export interface CreatedPortfolioItem {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

async function createPortfolioItem({
  name = 'Serviço Teste',
  description = null,
}: {
  name?: string;
  description?: string | null;
} = {}): Promise<CreatedPortfolioItem> {
  const { rows } = await getPool().query<CreatedPortfolioItem>(
    `INSERT INTO portfolio_items (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at, updated_at`,
    [name, description],
  );
  return rows[0];
}

export interface CreatedLead {
  id: string;
  company_name: string;
  cnpj: string;
  created_by: string;
  status: string;
  address_logradouro: string;
  address_numero: string;
  address_complemento: string | null;
  address_bairro: string;
  address_cidade: string;
  address_estado: string;
  address_cep: string;
  interest_items: string[];
  created_at: Date;
  updated_at: Date;
}

async function createLead({
  company_name = 'Empresa Teste',
  cnpj = '12.345.678/0001-95',
  created_by,
  status = 'nao_contatado',
  address_logradouro = 'Rua Teste',
  address_numero = '100',
  address_complemento = null,
  address_bairro = 'Centro',
  address_cidade = 'São Paulo',
  address_estado = 'SP',
  address_cep = '01310100',
  interest_items = [],
}: {
  company_name?: string;
  cnpj?: string;
  created_by: string;
  status?: string;
  address_logradouro?: string;
  address_numero?: string;
  address_complemento?: string | null;
  address_bairro?: string;
  address_cidade?: string;
  address_estado?: string;
  address_cep?: string;
  interest_items?: string[];
}): Promise<CreatedLead> {
  const { rows } = await getPool().query<CreatedLead>(
    `INSERT INTO leads (company_name, cnpj, created_by, status, address_logradouro, address_numero, address_complemento, address_bairro, address_cidade, address_estado, address_cep, interest_items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      company_name,
      cnpj,
      created_by,
      status,
      address_logradouro,
      address_numero,
      address_complemento,
      address_bairro,
      address_cidade,
      address_estado,
      address_cep,
      interest_items,
    ],
  );
  return rows[0];
}

export interface CreatedLeadContact {
  id: string;
  lead_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
}

async function createLeadContact({
  lead_id,
  name = 'Contato Teste',
  role = 'Responsável',
  email = null,
  phone = '11999999999',
}: {
  lead_id: string;
  name?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
}): Promise<CreatedLeadContact> {
  const { rows } = await getPool().query<CreatedLeadContact>(
    `INSERT INTO lead_contacts (lead_id, name, role, email, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, lead_id, name, role, email, phone`,
    [lead_id, name, role, email, phone],
  );
  return rows[0];
}

export interface CreatedLeadComment {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

async function createLeadComment({
  lead_id,
  user_id,
  content = 'Comentário de teste',
}: {
  lead_id: string;
  user_id: string;
  content?: string;
}): Promise<CreatedLeadComment> {
  const { rows } = await getPool().query<CreatedLeadComment>(
    `INSERT INTO lead_comments (lead_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, lead_id, user_id, content, created_at, updated_at`,
    [lead_id, user_id, content],
  );
  return rows[0];
}

export interface CreatedNorm {
  id: string;
  code: string;
  description: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
}

async function createNorm({
  code = 'AN00',
  description = 'Norma de teste',
  severity = 'leve',
}: {
  code?: string;
  description?: string;
  severity?: 'leve' | 'moderada' | 'grave' | 'desligamento';
} = {}): Promise<CreatedNorm> {
  const { rows } = await getPool().query<CreatedNorm>(
    `INSERT INTO company_norms (code, description, severity)
     VALUES ($1, $2, $3)
     RETURNING id, code, description, severity`,
    [code, description, severity],
  );
  return rows[0];
}

export interface CreatedViolation {
  id: string;
  user_id: string;
  norm_id: string;
  applied_by: string;
  reason: string | null;
  expires_at: Date;
  cancelled_at: Date | null;
  cancelled_by: string | null;
  applied_at: Date;
}

async function createViolation({
  user_id,
  norm_id,
  applied_by,
  reason = null,
  cancelled_at = null,
  cancelled_by = null,
}: {
  user_id: string;
  norm_id: string;
  applied_by: string;
  reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
}): Promise<CreatedViolation> {
  const { rows } = await getPool().query<CreatedViolation>(
    `INSERT INTO member_violations (user_id, norm_id, applied_by, reason, cancelled_at, cancelled_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, norm_id, applied_by, reason, expires_at, cancelled_at, cancelled_by, applied_at`,
    [user_id, norm_id, applied_by, reason, cancelled_at, cancelled_by],
  );
  return rows[0];
}

type MailcatcherMessage = {
  id: number;
  recipients: string[];
  subject: string;
  text: string;
};

async function waitForLastEmail(
  maxWait = 2000,
): Promise<MailcatcherMessage | null> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const email = await getLastEmail();
    if (email) return email;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
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

async function deleteAllEmails() {
  await fetch(`${emailHttpUrl}/messages`, {
    method: 'DELETE',
  });
}

async function getLastEmail(): Promise<MailcatcherMessage | null> {
  const emailListResponse = await fetch(`${emailHttpUrl}/messages`);
  const emailListBody =
    (await emailListResponse.json()) as MailcatcherMessage[];
  const lastEmailItem = emailListBody.pop();

  if (!lastEmailItem) {
    return null;
  }

  lastEmailItem.recipients = lastEmailItem.recipients.map((r) =>
    r.replace(/^<|>$/g, ''),
  );

  const emailTextResponse = await fetch(
    `${emailHttpUrl}/messages/${lastEmailItem.id}.plain`,
  );
  lastEmailItem.text = await emailTextResponse.text();

  return lastEmailItem;
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
      createPortfolioItem,
      createLead,
      createLeadContact,
      createLeadComment,
      createNorm,
      createViolation,
    },
  },
  email: {
    deleteAllEmails,
    getLastEmail,
    waitForLastEmail,
  },
};
