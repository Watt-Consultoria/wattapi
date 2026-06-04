import * as path from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

config({
  path: [
    path.resolve(__dirname, '../..', '..', '.env'),
    path.resolve(__dirname, '../..', '..', '.env.development'),
  ],
  quiet: true,
});

let pool: Pool;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not defined');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Ensure required rows exist
  await pool.query(
    `INSERT INTO auth.users (id, email)
     VALUES ('00000000-0000-0000-0000-000000000001', 'schema-test-user@watt-test.com')
     ON CONFLICT (id) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO users (id, email, name, role, sector, cpf)
     VALUES ('00000000-0000-0000-0000-000000000001', 'schema-test-user@watt-test.com', 'Schema Test User', 'consultor', 'projetos', '99999999999')
     ON CONFLICT (id) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO company_norms (id, code, description, severity)
     VALUES ('00000000-0000-0000-0000-000000000002', 'SCHTEST', 'Schema test norm', 'leve')
     ON CONFLICT (id) DO NOTHING`,
  );
});

afterAll(async () => {
  await pool.query(
    `DELETE FROM member_violations WHERE reason = 'schema-constraint-test'`,
  );
  await pool.end();
});

// ─── member_violations schema constraints ─────────────────────────────────────

describe('member_violations schema', () => {
  test('applied_by = NULL with source = automatic is accepted', async () => {
    const { rows } = await pool.query(
      `INSERT INTO member_violations (user_id, norm_id, applied_by, source, reason)
       VALUES ($1, $2, NULL, 'automatic', 'schema-constraint-test')
       RETURNING id, applied_by, source`,
      [
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ],
    );
    const row = rows[0] as { applied_by: string | null; source: string };
    expect(row.applied_by).toBeNull();
    expect(row.source).toBe('automatic');
  });

  test('applied_by = NULL with source = manual is rejected by CHECK constraint', async () => {
    await expect(
      pool.query(
        `INSERT INTO member_violations (user_id, norm_id, applied_by, source, reason)
         VALUES ($1, $2, NULL, 'manual', 'schema-constraint-test')`,
        [
          '00000000-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000002',
        ],
      ),
    ).rejects.toThrow(/chk_applied_by_source/);
  });
});
