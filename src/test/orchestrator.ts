import * as path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import retry from 'async-retry';
import * as jwt from 'jsonwebtoken';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

config({
  path: [
    path.resolve(__dirname, '../..', '.env'),
    path.resolve(__dirname, '../..', '.env.development'),
  ],
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
  await p.query('DELETE FROM heroes');
  await p.query('DELETE FROM cnpj_cache');
  await p.query('DELETE FROM push_subscriptions');
  await p.query('DELETE FROM psel_interview_evaluations');
  await p.query('DELETE FROM psel_interview_slots');
  await p.query('DELETE FROM psel_interview_tokens');
  await p.query('DELETE FROM psel_interview_bookings');
  await p.query('DELETE FROM candidates');
  await p.query('DELETE FROM selection_process_applications');
  await p.query('DELETE FROM selection_process_stages');
  await p.query('DELETE FROM selection_processes');
  await p.query('DELETE FROM gamification_submissions');
  await p.query('DELETE FROM gamification_tasks');
  await p.query('DELETE FROM gamification_cycles');
  await p.query('DELETE FROM notifications');
  await p.query('DELETE FROM activities');
  await p.query('DELETE FROM time_entries');
  await p.query('DELETE FROM routine_slots');
  await p.query('DELETE FROM reimbursements');
  await p.query('DELETE FROM project_feedback');
  await p.query('DELETE FROM project_reviews');
  await p.query('DELETE FROM stage_review_reworks');
  await p.query('DELETE FROM stage_reviews');
  await p.query('DELETE FROM stage_submission_files');
  await p.query('DELETE FROM stage_submissions');
  await p.query('DELETE FROM project_stage_deliverables');
  await p.query('DELETE FROM project_stages');
  await p.query('DELETE FROM projects');
  await p.query('DELETE FROM lead_comments');
  await p.query('DELETE FROM lead_contacts');
  await p.query('DELETE FROM leads');
  await p.query('DELETE FROM portfolio_items');
  await p.query('DELETE FROM member_violations');
  await p.query('DELETE FROM company_norms');
  await p.query('DELETE FROM internal_job_runs');
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

export interface CreatedCnpjCacheEntry {
  cnpj: string;
  data: Record<string, unknown>;
  fetched_at: Date;
}

async function createCnpjCacheEntry({
  cnpj,
  data,
}: {
  cnpj: string;
  data: Record<string, unknown>;
}): Promise<CreatedCnpjCacheEntry> {
  const { rows } = await getPool().query<CreatedCnpjCacheEntry>(
    `INSERT INTO cnpj_cache (cnpj, data) VALUES ($1, $2)
     RETURNING cnpj, data, fetched_at`,
    [cnpj, JSON.stringify(data)],
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
  applied_by: string | null;
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
    `INSERT INTO member_violations (user_id, norm_id, applied_by, source, reason, cancelled_at, cancelled_by)
     VALUES ($1, $2, $3, 'manual', $4, $5, $6)
     RETURNING id, user_id, norm_id, applied_by, reason, expires_at, cancelled_at, cancelled_by, applied_at`,
    [user_id, norm_id, applied_by, reason, cancelled_at, cancelled_by],
  );
  return rows[0];
}

async function deactivateUser(userId: string): Promise<void> {
  await getPool().query(`UPDATE users SET inactive = true WHERE id = $1`, [
    userId,
  ]);
}

export interface HouseRow {
  id: string;
  name: string;
}

async function getHouses(): Promise<HouseRow[]> {
  const { rows } = await getPool().query<HouseRow>(
    `SELECT id, name FROM houses ORDER BY name`,
  );
  return rows;
}

async function assignHouse(userId: string, houseId: string): Promise<void> {
  await getPool().query(`UPDATE users SET house_id = $1 WHERE id = $2`, [
    houseId,
    userId,
  ]);
}

export interface CreatedCycle {
  id: string;
  name: string;
  started_at: Date;
  ended_at: Date | null;
  created_by: string;
}

async function createCycle({
  name = 'Ciclo de Teste',
  created_by,
}: {
  name?: string;
  created_by: string;
}): Promise<CreatedCycle> {
  const { rows } = await getPool().query<CreatedCycle>(
    `INSERT INTO gamification_cycles (name, created_by)
     VALUES ($1, $2)
     RETURNING id, name, started_at, ended_at, created_by`,
    [name, created_by],
  );
  return rows[0];
}

export interface CreatedGamTask {
  id: string;
  title: string;
  description: string;
  points: number;
  is_active: boolean;
  created_by: string;
}

async function createGamTask({
  title = 'Tarefa de Teste',
  description = 'Descrição da tarefa de teste',
  points = 10,
  is_active = true,
  created_by,
}: {
  title?: string;
  description?: string;
  points?: number;
  is_active?: boolean;
  created_by: string;
}): Promise<CreatedGamTask> {
  const { rows } = await getPool().query<CreatedGamTask>(
    `INSERT INTO gamification_tasks (title, description, points, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, points, is_active, created_by`,
    [title, description, points, is_active, created_by],
  );
  return rows[0];
}

export interface CreatedSubmission {
  id: string;
  task_id: string;
  user_id: string;
  house_id: string;
  cycle_id: string;
  description: string;
  file_path: string;
  status: string;
}

async function createSubmission({
  task_id,
  user_id,
  house_id,
  cycle_id,
  description = 'Comprovante de teste',
  file_path,
}: {
  task_id: string;
  user_id: string;
  house_id: string;
  cycle_id: string;
  description?: string;
  file_path: string;
}): Promise<CreatedSubmission> {
  const { rows } = await getPool().query<CreatedSubmission>(
    `INSERT INTO gamification_submissions (task_id, user_id, house_id, cycle_id, description, file_path)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, task_id, user_id, house_id, cycle_id, description, file_path, status`,
    [task_id, user_id, house_id, cycle_id, description, file_path],
  );
  return rows[0];
}

export interface CreatedSelectionProcess {
  id: string;
  title: string;
}

async function createSelectionProcess({
  title = 'Processo Seletivo Teste',
}: {
  title?: string;
} = {}): Promise<CreatedSelectionProcess> {
  const { rows } = await getPool().query<CreatedSelectionProcess>(
    `INSERT INTO selection_processes (title, starts_at, ends_at)
     VALUES ($1, clock_timestamp() - INTERVAL '1 second', clock_timestamp() + INTERVAL '30 days')
     RETURNING id, title`,
    [title],
  );
  return rows[0];
}

export interface CreatedProcessStage {
  id: string;
  selection_process_id: string;
  name: string;
  position: number;
}

async function createProcessStage({
  selection_process_id,
  name = 'Etapa',
  position = 1,
}: {
  selection_process_id: string;
  name?: string;
  position?: number;
}): Promise<CreatedProcessStage> {
  const { rows } = await getPool().query<CreatedProcessStage>(
    `INSERT INTO selection_process_stages (selection_process_id, name, position)
     VALUES ($1, $2, $3)
     RETURNING id, selection_process_id, name, position`,
    [selection_process_id, name, position],
  );
  return rows[0];
}

async function createCurrentWeekTimeEntry({
  user_id,
}: {
  user_id: string;
}): Promise<CreatedTimeEntry> {
  const { rows } = await getPool().query<CreatedTimeEntry>(
    `INSERT INTO time_entries (user_id, clocked_in_at, clocked_out_at, is_valid)
     VALUES ($1,
       date_trunc('week', NOW()) + INTERVAL '4 hours',
       date_trunc('week', NOW()) + INTERVAL '8 hours',
       true)
     RETURNING id, user_id`,
    [user_id],
  );
  return rows[0];
}

async function uploadGamificationFile(
  userId: string,
  filename: string,
): Promise<string> {
  const filePath = `proofs/${userId}/${filename}`;
  const { error } = await getSupabase()
    .storage.from('gamification-proofs')
    .upload(filePath, Buffer.from('comprovante de teste'), {
      upsert: true,
      contentType: 'text/plain',
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return filePath;
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

export interface SelectionProcessFilePaths {
  resumePath: string;
  transcriptPath: string;
  photoPath: string;
}

async function uploadSelectionProcessFiles(
  folderUuid: string,
): Promise<SelectionProcessFilePaths> {
  const bucket = 'selection-process-files';
  const sb = getSupabase();

  const files = [
    { key: 'resume', name: 'resume.pdf', content: 'curriculo de teste' },
    {
      key: 'transcript',
      name: 'transcript.pdf',
      content: 'historico de teste',
    },
    { key: 'photo', name: 'photo.jpg', content: 'foto de teste' },
  ] as const;

  const paths: Record<string, string> = {};
  for (const f of files) {
    const filePath = `${folderUuid}/${f.name}`;
    const { error } = await sb.storage
      .from(bucket)
      .upload(filePath, Buffer.from(f.content), {
        upsert: true,
        contentType: 'text/plain',
      });
    if (error)
      throw new Error(`Storage upload failed (${f.name}): ${error.message}`);
    paths[`${f.key}Path`] = filePath;
  }

  return {
    resumePath: paths['resumePath'],
    transcriptPath: paths['transcriptPath'],
    photoPath: paths['photoPath'],
  };
}

export interface CreatedCandidate {
  id: string;
  selection_process_id: string;
  stage_id: string;
  name: string;
  email: string;
}

async function createCandidate({
  selection_process_id,
  stage_id,
  name = 'Candidato Teste',
  email,
}: {
  selection_process_id: string;
  stage_id: string;
  name?: string;
  email?: string;
}): Promise<CreatedCandidate> {
  const candidateEmail =
    email ??
    `candidato.seed.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
  const p = getPool();

  const { rows: appRows } = await p.query<{ id: string }>(
    `INSERT INTO selection_process_applications
       (selection_process_id, name, course, period, phone, email, instagram,
        how_heard, motivation, why_watt, shirt_size,
        resume_path, transcript_path, photo_path)
     VALUES ($1,$2,'Engenharia de Produção',3,'11999990000',$3,'@candidato',
             'Redes sociais','Motivação de teste','Por que Watt de teste',
             'M','00000000-0000-0000-0000-000000000001/resume.pdf',
             '00000000-0000-0000-0000-000000000001/transcript.pdf',
             '00000000-0000-0000-0000-000000000001/photo.jpg')
     RETURNING id`,
    [selection_process_id, name, candidateEmail],
  );

  const { rows } = await p.query<{ id: string }>(
    `INSERT INTO candidates
       (application_id, selection_process_id, current_stage_id, name, course,
        period, phone, email, photo_path, shirt_size)
     VALUES ($1,$2,$3,$4,'Engenharia de Produção',3,'11999990000',$5,
             '00000000-0000-0000-0000-000000000001/photo.jpg','M')
     RETURNING id`,
    [appRows[0].id, selection_process_id, stage_id, name, candidateEmail],
  );

  return {
    id: rows[0].id,
    selection_process_id,
    stage_id,
    name,
    email: candidateEmail,
  };
}

export interface CreatedInterviewSlot {
  id: string;
  selection_process_id: string;
  consultant_id: string;
  starts_at: Date;
  ends_at: Date;
  booking_id: string | null;
}

async function createInterviewSlot({
  selection_process_id,
  consultant_id,
  starts_at = '2027-01-01T11:00:00Z',
  ends_at,
  booking_id = null,
}: {
  selection_process_id: string;
  consultant_id: string;
  starts_at?: string;
  ends_at?: string;
  booking_id?: string | null;
}): Promise<CreatedInterviewSlot> {
  const resolvedEndsAt =
    ends_at ??
    new Date(new Date(starts_at).getTime() + 60 * 60 * 1000).toISOString();

  const { rows } = await getPool().query<CreatedInterviewSlot>(
    `INSERT INTO psel_interview_slots
       (selection_process_id, consultant_id, starts_at, ends_at, booking_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (consultant_id, starts_at) DO NOTHING
     RETURNING id, selection_process_id, consultant_id, starts_at, ends_at, booking_id`,
    [
      selection_process_id,
      consultant_id,
      starts_at,
      resolvedEndsAt,
      booking_id,
    ],
  );
  return rows[0];
}

export interface CreatedInterviewToken {
  id: string;
  candidate_id: string;
  token: string;
  expires_at: Date;
}

async function createInterviewToken({
  candidate_id,
  token,
  expires_at,
}: {
  candidate_id: string;
  token?: string;
  expires_at?: string;
}): Promise<CreatedInterviewToken> {
  const resolvedToken = token ?? crypto.randomUUID();
  const resolvedExpiresAt =
    expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { rows } = await getPool().query<CreatedInterviewToken>(
    `INSERT INTO psel_interview_tokens (candidate_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, candidate_id, token, expires_at`,
    [candidate_id, resolvedToken, resolvedExpiresAt],
  );
  return rows[0];
}

export interface CreatedInterviewBooking {
  id: string;
  selection_process_id: string;
  candidate_id: string;
  starts_at: Date;
  ends_at: Date;
}

async function createInterviewBooking({
  selection_process_id,
  candidate_id,
  starts_at = '2027-01-01T11:00:00Z',
  ends_at,
}: {
  selection_process_id: string;
  candidate_id: string;
  starts_at?: string;
  ends_at?: string;
}): Promise<CreatedInterviewBooking> {
  const resolvedEndsAt =
    ends_at ??
    new Date(new Date(starts_at).getTime() + 60 * 60 * 1000).toISOString();

  const { rows } = await getPool().query<CreatedInterviewBooking>(
    `INSERT INTO psel_interview_bookings
       (selection_process_id, candidate_id, starts_at, ends_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, selection_process_id, candidate_id, starts_at, ends_at`,
    [selection_process_id, candidate_id, starts_at, resolvedEndsAt],
  );
  return rows[0];
}

export interface CreatedProject {
  id: string;
  lead_id: string;
  project_type_id: string;
  name: string;
  description: string | null;
  delivery_date: string;
  status: string;
  created_by: string;
}

async function createProject({
  lead_id,
  project_type_id,
  name = 'Projeto Teste',
  description = null,
  delivery_date = '2027-01-01',
  status = 'em_andamento',
  created_by,
}: {
  lead_id: string;
  project_type_id: string;
  name?: string;
  description?: string | null;
  delivery_date?: string;
  status?: string;
  created_by: string;
}): Promise<CreatedProject> {
  const { rows } = await getPool().query<CreatedProject>(
    `INSERT INTO projects (lead_id, project_type_id, name, description, delivery_date, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, lead_id, project_type_id, name, description,
               to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date, status, created_by`,
    [
      lead_id,
      project_type_id,
      name,
      description,
      delivery_date,
      status,
      created_by,
    ],
  );
  return rows[0];
}

export interface CreatedProjectStageDeliverable {
  id: string;
  stage_id: string;
  name: string;
  description: string;
}

export interface CreatedProjectStage {
  id: string;
  project_id: string;
  delivery_date: string;
  deadline_date: string;
  name: string;
  description: string;
  position: number;
  consultant_id: string;
  status: string;
  created_by: string;
  deliverables: CreatedProjectStageDeliverable[];
}

async function createProjectStage({
  project_id,
  delivery_date = '2026-12-01',
  deadline_date = '2026-12-15',
  name = 'Etapa Teste',
  description = 'Descrição da etapa de teste',
  position = 1,
  consultant_id,
  status = 'pendente',
  created_by,
  deliverables = [
    { name: 'Documento', description: 'Documento entregável de teste' },
  ],
}: {
  project_id: string;
  delivery_date?: string;
  deadline_date?: string;
  name?: string;
  description?: string;
  position?: number;
  consultant_id: string;
  status?: string;
  created_by: string;
  deliverables?: Array<{ name: string; description: string }>;
}): Promise<CreatedProjectStage> {
  const p = getPool();
  const { rows } = await p.query<
    Omit<
      CreatedProjectStage,
      'deliverables' | 'delivery_date' | 'deadline_date'
    > & {
      delivery_date: string;
      deadline_date: string;
    }
  >(
    `INSERT INTO project_stages (project_id, delivery_date, deadline_date, name, description, position, consultant_id, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, project_id, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date,
               to_char(deadline_date, 'YYYY-MM-DD') AS deadline_date, name, description,
               position, consultant_id, status, created_by`,
    [
      project_id,
      delivery_date,
      deadline_date,
      name,
      description,
      position,
      consultant_id,
      status,
      created_by,
    ],
  );
  const stage = rows[0];

  const createdDeliverables: CreatedProjectStageDeliverable[] = [];
  for (const d of deliverables) {
    const { rows: dRows } = await p.query<CreatedProjectStageDeliverable>(
      `INSERT INTO project_stage_deliverables (stage_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, stage_id, name, description`,
      [stage.id, d.name, d.description],
    );
    createdDeliverables.push(dRows[0]);
  }

  return { ...stage, deliverables: createdDeliverables };
}

export interface CreatedStageSubmissionFile {
  id: string;
  submission_id: string;
  deliverable_id: string;
  path: string;
  name: string;
}

export interface CreatedStageSubmission {
  id: string;
  stage_id: string;
  notes: string | null;
  attempt: number;
  submitted_by: string;
  files: CreatedStageSubmissionFile[];
}

async function createStageSubmission({
  stage_id,
  notes = null,
  attempt = 1,
  submitted_by,
  files = [],
}: {
  stage_id: string;
  notes?: string | null;
  attempt?: number;
  submitted_by: string;
  files?: Array<{ deliverable_id: string; path: string; name: string }>;
}): Promise<CreatedStageSubmission> {
  const p = getPool();
  const { rows } = await p.query<Omit<CreatedStageSubmission, 'files'>>(
    `INSERT INTO stage_submissions (stage_id, notes, attempt, submitted_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, stage_id, notes, attempt, submitted_by`,
    [stage_id, notes, attempt, submitted_by],
  );
  const submission = rows[0];

  const createdFiles: CreatedStageSubmissionFile[] = [];
  for (const f of files) {
    const { rows: fRows } = await p.query<CreatedStageSubmissionFile>(
      `INSERT INTO stage_submission_files (submission_id, deliverable_id, path, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, submission_id, deliverable_id, path, name`,
      [submission.id, f.deliverable_id, f.path, f.name],
    );
    createdFiles.push(fRows[0]);
  }

  return { ...submission, files: createdFiles };
}

export interface CreatedStageReview {
  id: string;
  submission_id: string;
  approved: boolean;
  notes: string | null;
  new_delivery_date: string | null;
  reviewed_by: string;
}

async function createStageReview({
  submission_id,
  approved,
  notes = null,
  new_delivery_date = null,
  reviewed_by,
  deliverable_ids = [],
}: {
  submission_id: string;
  approved: boolean;
  notes?: string | null;
  new_delivery_date?: string | null;
  reviewed_by: string;
  deliverable_ids?: string[];
}): Promise<CreatedStageReview> {
  const p = getPool();
  const { rows } = await p.query<
    Omit<CreatedStageReview, 'new_delivery_date'> & {
      new_delivery_date: string | null;
    }
  >(
    `INSERT INTO stage_reviews (submission_id, approved, notes, new_delivery_date, reviewed_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, submission_id, approved, notes,
               to_char(new_delivery_date, 'YYYY-MM-DD') AS new_delivery_date, reviewed_by`,
    [submission_id, approved, notes, new_delivery_date, reviewed_by],
  );
  const review = rows[0];

  for (const deliverableId of deliverable_ids) {
    await p.query(
      `INSERT INTO stage_review_reworks (review_id, deliverable_id) VALUES ($1, $2)`,
      [review.id, deliverableId],
    );
  }

  return review;
}

export interface CreatedProjectReview {
  id: string;
  project_id: string;
  round: number;
  approved: boolean;
  notes: string;
  reviewer_id: string;
}

async function createProjectReview({
  project_id,
  round = 1,
  approved,
  notes = 'Notas de revisão de teste',
  reviewer_id,
}: {
  project_id: string;
  round?: number;
  approved: boolean;
  notes?: string;
  reviewer_id: string;
}): Promise<CreatedProjectReview> {
  const { rows } = await getPool().query<CreatedProjectReview>(
    `INSERT INTO project_reviews (project_id, round, approved, notes, reviewer_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, project_id, round, approved, notes, reviewer_id`,
    [project_id, round, approved, notes, reviewer_id],
  );
  return rows[0];
}

export interface CreatedProjectFeedback {
  id: string;
  project_id: string;
  consultor_id: string;
  answers: Record<string, unknown>;
}

async function createProjectFeedback({
  project_id,
  consultor_id,
  answers = { satisfacao: 'boa' },
}: {
  project_id: string;
  consultor_id: string;
  answers?: Record<string, unknown>;
}): Promise<CreatedProjectFeedback> {
  const { rows } = await getPool().query<CreatedProjectFeedback>(
    `INSERT INTO project_feedback (project_id, consultor_id, answers)
     VALUES ($1, $2, $3)
     RETURNING id, project_id, consultor_id, answers`,
    [project_id, consultor_id, JSON.stringify(answers)],
  );
  return rows[0];
}

async function uploadProjectStageFile(
  consultantId: string,
  filename: string,
): Promise<string> {
  const filePath = `stage-files/${consultantId}/${filename}`;
  const { error } = await getSupabase()
    .storage.from('project-stage-files')
    .upload(filePath, Buffer.from('entregável de teste'), {
      upsert: true,
      contentType: 'text/plain',
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return filePath;
}

export interface CreatedHero {
  id: string;
  user_id: string;
  phrase: string;
  contributions: string;
  start_year: number;
  end_year: number;
  photo_path: string;
}

async function createHero({
  user_id,
  phrase = 'Fez a diferença em tudo que tocou.',
  contributions = ['Contribuição de teste'],
  start_year = 2020,
  end_year = 2023,
  photo_path,
}: {
  user_id: string;
  phrase?: string;
  contributions?: string[];
  start_year?: number;
  end_year?: number;
  photo_path: string;
}): Promise<CreatedHero> {
  const { rows } = await getPool().query<CreatedHero>(
    `INSERT INTO heroes (user_id, phrase, contributions, start_year, end_year, photo_path)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, phrase, contributions, start_year, end_year, photo_path`,
    [
      user_id,
      phrase,
      contributions.join(', '),
      start_year,
      end_year,
      photo_path,
    ],
  );
  return rows[0];
}

async function uploadHeroPhoto(
  userId: string,
  filename: string,
): Promise<string> {
  const filePath = `heroes/${userId}/${filename}`;
  const { error } = await getSupabase()
    .storage.from('hero-photos')
    .upload(filePath, Buffer.from('foto de teste'), {
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

async function getAllEmails(): Promise<MailcatcherMessage[]> {
  const response = await fetch(`${emailHttpUrl}/messages`);
  const list = (await response.json()) as MailcatcherMessage[];
  return list.map((m) => ({
    ...m,
    recipients: m.recipients.map((r) => r.replace(/^<|>$/g, '')),
  }));
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
      uploadSelectionProcessFiles,
      createPortfolioItem,
      createLead,
      createLeadContact,
      createLeadComment,
      createCnpjCacheEntry,
      createNorm,
      createViolation,
      deactivateUser,
      getHouses,
      assignHouse,
      createCycle,
      createGamTask,
      createSubmission,
      uploadGamificationFile,
      createSelectionProcess,
      createProcessStage,
      createCurrentWeekTimeEntry,
      createCandidate,
      createInterviewSlot,
      createInterviewToken,
      createInterviewBooking,
      createProject,
      createProjectStage,
      createStageSubmission,
      createStageReview,
      createProjectReview,
      createProjectFeedback,
      uploadProjectStageFile,
      createHero,
      uploadHeroPhoto,
    },
  },
  email: {
    deleteAllEmails,
    getAllEmails,
    getLastEmail,
    waitForLastEmail,
  },
};
