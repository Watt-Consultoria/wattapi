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
    email: 'ana.silva@watt.com',
    name: 'Ana Silva',
    role: 'consultor',
    sector: 'comercial',
    cpf: '12345678901',
  },
  {
    email: 'carlos.santos@watt.com',
    name: 'Carlos Santos',
    role: 'gerente',
    sector: 'projetos',
    cpf: '98765432100',
  },
  {
    email: 'maria.oliveira@watt.com',
    name: 'Maria Oliveira',
    role: 'diretor',
    sector: 'executivo',
    cpf: '11122233344',
  },
];

export async function seedUsers(pool: Pool): Promise<SeedUser[]> {
  await pool.query('DELETE FROM users');

  const inserted: SeedUser[] = [];

  for (const user of FAKE_USERS) {
    const result = await pool.query<DbUser>(
      `INSERT INTO users (email, name, role, sector, cpf)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, sector, cpf, created_at, updated_at`,
      [user.email, user.name, user.role, user.sector, user.cpf],
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
  await pool.query('DELETE FROM users');
}
