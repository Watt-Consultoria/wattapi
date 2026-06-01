import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

config({
  path: path.resolve(__dirname, '../../..', '.env.development'),
  quiet: true,
});

const BASE_URL = 'http://localhost:3001/time-entries';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function signToken(sub: string): string {
  return jwt.sign({ sub }, JWT_SECRET);
}

function authHeaders(userId: string) {
  return { Authorization: `Bearer ${signToken(userId)}` };
}

// seededUsers indices by role:
// [0] consultor  — ana.silva@watt.com
// [1] gerente    — carlos.santos@watt.com
// [2] diretor    — maria.oliveira@watt.com
// [3] assessor   — joao.assessor@watt.com   (superuser, rank >= 3)
// [4] presidente — lucia.presidente@watt.com (superuser, rank >= 3)

let seededUsers: SeedUser[] = [];
let pool: Pool;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
});

afterEach(async () => {
  await orchestrator.clearTransactionalData();
});

afterAll(async () => {
  await pool.end();
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

// ─── POST /time-entries/clock-in ────────────────────────────────────────────

describe('POST /time-entries/clock-in', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/clock-in`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 201 and create a new session', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/clock-in`, {
      method: 'POST',
      headers: authHeaders(user.id),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; clocked_in_at: string };
    expect(typeof body.id).toBe('string');
    expect(typeof body.clocked_in_at).toBe('string');
  });

  it('should return HTTP 409 when user already has an open session', async () => {
    const user = seededUsers[0];
    const headers = authHeaders(user.id);

    await fetch(`${BASE_URL}/clock-in`, { method: 'POST', headers });

    const res = await fetch(`${BASE_URL}/clock-in`, {
      method: 'POST',
      headers,
    });
    expect(res.status).toBe(409);
  });

  it('should not accept a request body with timestamps', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/clock-in`, {
      method: 'POST',
      headers: { ...authHeaders(user.id), 'Content-Type': 'application/json' },
      body: JSON.stringify({ clocked_in_at: '2020-01-01T00:00:00Z' }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { clocked_in_at: string };
    expect(new Date(body.clocked_in_at).getFullYear()).toBeGreaterThanOrEqual(
      2026,
    );
  });
});

// ─── POST /time-entries/clock-out ───────────────────────────────────────────

describe('POST /time-entries/clock-out', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/clock-out`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 409 when no open session exists', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/clock-out`, {
      method: 'POST',
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(409);
  });

  it('should return HTTP 200 with status valid when session is within 8h', async () => {
    const user = seededUsers[0];
    const headers = authHeaders(user.id);

    await fetch(`${BASE_URL}/clock-in`, { method: 'POST', headers });
    const res = await fetch(`${BASE_URL}/clock-out`, {
      method: 'POST',
      headers,
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      id: string;
      clocked_in_at: string;
      clocked_out_at: string;
      duration_minutes: number;
    };
    expect(body.status).toBe('valid');
    expect(typeof body.id).toBe('string');
    expect(typeof body.clocked_in_at).toBe('string');
    expect(typeof body.clocked_out_at).toBe('string');
    expect(typeof body.duration_minutes).toBe('number');
  });

  it('should return HTTP 200 with status annulled when session exceeds 8h', async () => {
    const user = seededUsers[0];

    await pool.query(
      `INSERT INTO time_entries (user_id, clocked_in_at) VALUES ($1, now() - interval '9 hours')`,
      [user.id],
    );

    const res = await fetch(`${BASE_URL}/clock-out`, {
      method: 'POST',
      headers: authHeaders(user.id),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      reason: string;
      duration_minutes: number;
    };
    expect(body.status).toBe('annulled');
    expect(body.reason).toBe('exceeded_max_duration');
    expect(body.duration_minutes).toBeGreaterThan(480);
  });
});

// ─── GET /time-entries/summary/me ───────────────────────────────────────────

describe('GET /time-entries/summary/me', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/summary/me`);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 for the authenticated user', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/summary/me`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
  });

  it('should return current_session none when no open session', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/summary/me`, {
      headers: authHeaders(user.id),
    });
    const body = (await res.json()) as {
      current_session: { status: string };
      valid_sessions: unknown[];
      total_minutes: number;
    };
    expect(body.current_session.status).toBe('none');
    expect(Array.isArray(body.valid_sessions)).toBe(true);
    expect(typeof body.total_minutes).toBe('number');
  });

  it('should return current_session open when user has an open session within 8h', async () => {
    const user = seededUsers[0];
    const headers = authHeaders(user.id);

    await fetch(`${BASE_URL}/clock-in`, { method: 'POST', headers });

    const res = await fetch(`${BASE_URL}/summary/me`, { headers });
    const body = (await res.json()) as {
      current_session: { status: string; elapsed_minutes: number };
    };
    expect(body.current_session.status).toBe('open');
    expect(typeof body.current_session.elapsed_minutes).toBe('number');
  });

  it('should return current_session invalid when open session exceeds 8h', async () => {
    const user = seededUsers[0];

    await pool.query(
      `INSERT INTO time_entries (user_id, clocked_in_at) VALUES ($1, now() - interval '9 hours')`,
      [user.id],
    );

    const res = await fetch(`${BASE_URL}/summary/me`, {
      headers: authHeaders(user.id),
    });
    const body = (await res.json()) as {
      current_session: { status: string; reason: string };
    };
    expect(body.current_session.status).toBe('invalid');
    expect(body.current_session.reason).toBe('exceeded_max_duration');
  });

  it('should include valid sessions in the weekly total', async () => {
    const user = seededUsers[0];

    await pool.query(
      `INSERT INTO time_entries (user_id, clocked_in_at, clocked_out_at, is_valid)
       VALUES ($1, now() - interval '5 hours', now() - interval '1 hour', true)`,
      [user.id],
    );

    const res = await fetch(`${BASE_URL}/summary/me`, {
      headers: authHeaders(user.id),
    });
    const body = (await res.json()) as {
      valid_sessions: unknown[];
      total_minutes: number;
    };
    expect(body.valid_sessions).toHaveLength(1);
    expect(body.total_minutes).toBeGreaterThan(230);
    expect(body.total_minutes).toBeLessThan(250);
  });

  it('should not include annulled sessions in the weekly total', async () => {
    const user = seededUsers[0];

    await pool.query(
      `INSERT INTO time_entries (user_id, clocked_in_at, clocked_out_at, is_valid, annulled_reason)
       VALUES ($1, now() - interval '10 hours', now() - interval '1 hour', false, 'exceeded_max_duration')`,
      [user.id],
    );

    const res = await fetch(`${BASE_URL}/summary/me`, {
      headers: authHeaders(user.id),
    });
    const body = (await res.json()) as {
      valid_sessions: unknown[];
      total_minutes: number;
    };
    expect(body.valid_sessions).toHaveLength(0);
    expect(body.total_minutes).toBe(0);
  });
});

// ─── GET /time-entries/summary/:userId ──────────────────────────────────────

describe('GET /time-entries/summary/:userId', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/summary/${target.id}`);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 when non-superuser requests another user summary', async () => {
    const consultor = seededUsers[0];
    const another = seededUsers[1];

    const res = await fetch(`${BASE_URL}/summary/${another.id}`, {
      headers: authHeaders(consultor.id),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 200 when superuser requests another user summary', async () => {
    const superuser = seededUsers[3]; // assessor
    const target = seededUsers[0];

    const res = await fetch(`${BASE_URL}/summary/${target.id}`, {
      headers: authHeaders(superuser.id),
    });
    expect(res.status).toBe(200);
  });

  it('should include min_hours_met in summary response', async () => {
    const superuser = seededUsers[3];
    const target = seededUsers[0];

    const res = await fetch(`${BASE_URL}/summary/${target.id}`, {
      headers: authHeaders(superuser.id),
    });
    const body = (await res.json()) as { min_hours_met: unknown };
    expect(typeof body.min_hours_met).toBe('boolean');
  });
});

// ─── GET /time-entries ───────────────────────────────────────────────────────

describe('GET /time-entries', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 when non-superuser requests the list', async () => {
    const consultor = seededUsers[0];
    const res = await fetch(BASE_URL, { headers: authHeaders(consultor.id) });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 400 for non-numeric week param', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(`${BASE_URL}?week=abc`, {
      headers: authHeaders(superuser.id),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for negative week param', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(`${BASE_URL}?week=-1`, {
      headers: authHeaders(superuser.id),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 200 with members list for superuser', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, { headers: authHeaders(superuser.id) });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      week_start: unknown;
      week_end: unknown;
      min_week_hours: unknown;
      members: unknown[];
    };
    expect(typeof body.week_start).toBe('string');
    expect(typeof body.week_end).toBe('string');
    expect(typeof body.min_week_hours).toBe('number');
    expect(Array.isArray(body.members)).toBe(true);
  });

  it('should return HTTP 200 for previous week (week=1)', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(`${BASE_URL}?week=1`, {
      headers: authHeaders(superuser.id),
    });
    expect(res.status).toBe(200);
  });

  it('should include min_hours_met per member', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, { headers: authHeaders(superuser.id) });
    const body = (await res.json()) as {
      members: { min_hours_met: unknown }[];
    };
    expect(body.members.length).toBeGreaterThan(0);
    body.members.forEach((m) => {
      expect(typeof m.min_hours_met).toBe('boolean');
    });
  });

  it('should not include soft-deleted users in the list', async () => {
    const superuser = seededUsers[3];
    const target = seededUsers[1];

    await pool.query(
      'UPDATE users SET inactive = true, updated_at = now() WHERE id = $1',
      [target.id],
    );

    const res = await fetch(BASE_URL, { headers: authHeaders(superuser.id) });
    const body = (await res.json()) as { members: { user_id: string }[] };
    const found = body.members.some((m) => m.user_id === target.id);
    expect(found).toBe(false);

    await pool.query(
      'UPDATE users SET inactive = false, updated_at = now() WHERE id = $1',
      [target.id],
    );
  });
});
