import { Pool } from 'pg';

export interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: string;
  updated_at: string;
}

interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: Date;
  updated_at: Date;
}

const FAKE_USERS = [
  {
    id: '10000000-0001-0001-0001-000000000001',
    email: 'ana.silva@watt.com',
    name: 'Ana Silva',
    role: 'consultor',
    sector: 'comercial',
    cpf: '12345678901',
  },
  {
    id: '10000000-0002-0002-0002-000000000002',
    email: 'carlos.santos@watt.com',
    name: 'Carlos Santos',
    role: 'gerente',
    sector: 'projetos',
    cpf: '98765432100',
  },
  {
    id: '10000000-0003-0003-0003-000000000003',
    email: 'maria.oliveira@watt.com',
    name: 'Maria Oliveira',
    role: 'diretor',
    sector: 'executivo',
    cpf: '11122233344',
  },
  {
    id: '10000000-0004-0004-0004-000000000004',
    email: 'joao.assessor@watt.com',
    name: 'João Assessor',
    role: 'assessor',
    sector: 'institucional',
    cpf: '55566677788',
  },
  {
    id: '10000000-0005-0005-0005-000000000005',
    email: 'lucia.presidente@watt.com',
    name: 'Lucia Presidente',
    role: 'presidente',
    sector: 'executivo',
    cpf: '99988877766',
  },
  {
    id: '10000000-0006-0006-0006-000000000006',
    email: 'inactive.auth@watt.com',
    name: 'Inactive Auth User',
    role: 'consultor',
    sector: 'comercial',
    cpf: '77766655544',
  },
];

// Auth-only entries: exist in auth.users but not yet in public.users (for POST /users tests)
const AUTH_ONLY_USERS = [
  { id: '00000000-0000-0000-0000-000000000097', email: 'outro.novo@watt.com' },
  {
    id: '00000000-0000-0000-0000-000000000099',
    email: 'novo.usuario@watt.com',
  },
];

const ALL_TEST_IDS = [
  ...FAKE_USERS.map((u) => u.id),
  ...AUTH_ONLY_USERS.map((u) => u.id),
];

export async function seedUsers(pool: Pool): Promise<SeedUser[]> {
  await pool.query('DELETE FROM users');
  await pool.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    ALL_TEST_IDS,
  ]);

  for (const u of [...FAKE_USERS, ...AUTH_ONLY_USERS]) {
    await pool.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email],
    );
  }

  const inserted: SeedUser[] = [];

  for (const user of FAKE_USERS) {
    const result = await pool.query<DbUser>(
      `INSERT INTO users (id, email, name, role, sector, cpf)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, sector, cpf, created_at, updated_at`,
      [user.id, user.email, user.name, user.role, user.sector, user.cpf],
    );

    const row = result.rows[0];
    inserted.push({
      ...row,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    });
  }

  return inserted;
}

export async function clearUsers(pool: Pool): Promise<void> {
  await pool.query('DELETE FROM time_entries');
  await pool.query('DELETE FROM users');
  await pool.query(`DELETE FROM auth.users WHERE id = ANY($1::uuid[])`, [
    ALL_TEST_IDS,
  ]);
}
