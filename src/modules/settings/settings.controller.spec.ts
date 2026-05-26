import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

config({
  path: path.resolve(__dirname, '../../..', '.env.development'),
  quiet: true,
});

const BASE_URL = 'http://localhost:3000/settings';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function signToken(sub: string): string {
  return jwt.sign({ sub }, JWT_SECRET);
}

function authHeaders(userId: string) {
  return { Authorization: `Bearer ${signToken(userId)}` };
}

function jsonHeaders(userId: string) {
  return {
    ...authHeaders(userId),
    'Content-Type': 'application/json',
  };
}

// seededUsers indices:
// [0] consultor  — não-superusuário
// [3] assessor   — superusuário (rank >= 3)

let seededUsers: SeedUser[] = [];

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

afterEach(async () => {
  const superuser = seededUsers[3];
  await fetch(BASE_URL, {
    method: 'PATCH',
    headers: jsonHeaders(superuser.id),
    body: JSON.stringify({ min_week_hours: 40 }),
  });
});

// ─── GET /settings ───────────────────────────────────────────────────────────

describe('GET /settings', () => {
  it('should return HTTP 401 without token', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 with settings for any authenticated user', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, { headers: authHeaders(user.id) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { min_week_hours: number };
    expect(typeof body.min_week_hours).toBe('number');
  });
});

// ─── PATCH /settings ─────────────────────────────────────────────────────────

describe('PATCH /settings', () => {
  it('should return HTTP 401 without token', async () => {
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ min_week_hours: 35 }),
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 for non-superuser', async () => {
    const consultor = seededUsers[0];
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(consultor.id),
      body: JSON.stringify({ min_week_hours: 35 }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 200 and updated settings for superuser', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(superuser.id),
      body: JSON.stringify({ min_week_hours: 35 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { min_week_hours: number };
    expect(body.min_week_hours).toBe(35);
  });

  it('should reflect the updated value immediately in subsequent GET (hot-reload)', async () => {
    const superuser = seededUsers[3];
    const user = seededUsers[0];

    await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(superuser.id),
      body: JSON.stringify({ min_week_hours: 32 }),
    });

    const res = await fetch(BASE_URL, { headers: authHeaders(user.id) });
    const body = (await res.json()) as { min_week_hours: number };
    expect(body.min_week_hours).toBe(32);
  });

  it('should return HTTP 400 for invalid field type', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(superuser.id),
      body: JSON.stringify({ min_week_hours: 'abc' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for empty body', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(superuser.id),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for negative value', async () => {
    const superuser = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'PATCH',
      headers: jsonHeaders(superuser.id),
      body: JSON.stringify({ min_week_hours: -1 }),
    });
    expect(res.status).toBe(400);
  });
});
