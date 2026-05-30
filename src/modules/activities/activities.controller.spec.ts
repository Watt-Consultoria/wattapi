import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

config({
  path: path.resolve(__dirname, '../../..', '.env.development'),
  quiet: true,
});

const BASE_URL = 'http://localhost:3001/activities';
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
  return { ...authHeaders(userId), 'Content-Type': 'application/json' };
}

const validActivity = {
  name: 'Reunião de alinhamento',
  description: 'Alinhamento semanal',
  date: '2026-06-01',
  time_start: '09:00',
  time_end: '10:00',
  priority: 'alta',
};

// Seed users:
// [0] Ana Silva     — consultor,  comercial
// [1] Carlos Santos — gerente,    projetos
// [2] Maria Oliveira— diretor,    executivo
// [3] João Assessor — assessor,   institucional
// [4] Lucia Pres.   — presidente, executivo
// [5] Inactive Auth — consultor,  comercial  (inactive)
// [6] Paulo Projetos— consultor,  projetos

let seededUsers: SeedUser[] = [];
let createdActivityId: string;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

// ─── POST /activities ─────────────────────────────────────────────────────────

describe('POST /activities', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validActivity),
    });
    expect(res.status).toBe(401);
  });

  it('should return 400 with missing required fields', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({ name: 'Apenas nome' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 when time_end is before time_start', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({
        ...validActivity,
        time_start: '10:00',
        time_end: '09:00',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 201 and create activity for authenticated user', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(user.id),
      body: JSON.stringify(validActivity),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; user_id: string };
    expect(body.user_id).toBe(user.id);
    expect(typeof body.id).toBe('string');
    createdActivityId = body.id;
  });
});

// ─── GET /activities ──────────────────────────────────────────────────────────

describe('GET /activities', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return 200 with own activities for consultor', async () => {
    const user = seededUsers[0]; // consultor, comercial
    const res = await fetch(BASE_URL, { headers: authHeaders(user.id) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_id: string }[];
    expect(Array.isArray(body)).toBe(true);
    // consultor only sees their own
    body.forEach((a) => expect(a.user_id).toBe(user.id));
  });

  it('should return 200 for assessor seeing all activities', async () => {
    const assessor = seededUsers[3];
    const res = await fetch(BASE_URL, { headers: authHeaders(assessor.id) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });

  it('should filter by exact date', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}?date=2026-06-01`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { date: string }[];
    body.forEach((a) => expect(a.date).toBe('2026-06-01'));
  });

  it('should filter by from/to range', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}?from=2026-06-01&to=2026-06-30`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { date: string }[];
    body.forEach((a) => {
      expect(a.date >= '2026-06-01').toBe(true);
      expect(a.date <= '2026-06-30').toBe(true);
    });
  });

  it('should return empty when filtering outside date range', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}?date=1999-01-01`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(0);
  });

  it('should filter by user id and return only that user activities (within visibility)', async () => {
    // gerente projetos filtering by consultor projetos — visible
    const gerente = seededUsers[1]; // Carlos Santos, gerente, projetos
    const consultor = seededUsers[6]; // Paulo Projetos, consultor, projetos

    // First create an activity for the consultor so there's something to find
    const createRes = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(consultor.id),
      body: JSON.stringify({ ...validActivity, date: '2026-07-01' }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const res = await fetch(`${BASE_URL}?id=${consultor.id}`, {
      headers: authHeaders(gerente.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_id: string }[];
    body.forEach((a) => expect(a.user_id).toBe(consultor.id));

    // cleanup
    await fetch(`${BASE_URL}/${created.id}`, {
      method: 'DELETE',
      headers: authHeaders(consultor.id),
    });
  });

  it('should return empty when filtering by a user outside visibility scope', async () => {
    // consultor filtering by gerente — not visible (gerente has higher rank)
    const consultor = seededUsers[0]; // Ana Silva, consultor, comercial
    const gerente = seededUsers[1]; // Carlos Santos, gerente, projetos

    const res = await fetch(`${BASE_URL}?id=${gerente.id}`, {
      headers: authHeaders(consultor.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(0);
  });
});

// ─── GET /activities/me ───────────────────────────────────────────────────────

describe('GET /activities/me', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(`${BASE_URL}/me`);
    expect(res.status).toBe(401);
  });

  it('should return only own activities', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/me`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_id: string }[];
    expect(Array.isArray(body)).toBe(true);
    body.forEach((a) => expect(a.user_id).toBe(user.id));
  });

  it('should support date filter', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/me?date=2026-06-01`, {
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { date: string; user_id: string }[];
    body.forEach((a) => {
      expect(a.date).toBe('2026-06-01');
      expect(a.user_id).toBe(user.id);
    });
  });

  it('should return own activities even for superuser (not all)', async () => {
    const assessor = seededUsers[3]; // Pedro Alves, assessor
    const res = await fetch(`${BASE_URL}/me`, {
      headers: authHeaders(assessor.id),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_id: string }[];
    body.forEach((a) => expect(a.user_id).toBe(assessor.id));
  });
});

// ─── PATCH /activities/:id ────────────────────────────────────────────────────

describe('PATCH /activities/:id', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Novo nome' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 400 with empty body', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'PATCH',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should return 403 when non-owner tries to edit', async () => {
    const other = seededUsers[1]; // gerente, projetos (not owner)
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'PATCH',
      headers: jsonHeaders(other.id),
      body: JSON.stringify({ name: 'Tentativa' }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 200 and update activity for owner', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'PATCH',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({ name: 'Nome atualizado' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe('Nome atualizado');
  });

  it('should return 404 for non-existent activity', async () => {
    const user = seededUsers[0];
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'PATCH',
        headers: jsonHeaders(user.id),
        body: JSON.stringify({ name: 'X' }),
      },
    );
    expect(res.status).toBe(404);
  });
});

// ─── DELETE /activities/:id ───────────────────────────────────────────────────

describe('DELETE /activities/:id', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 when non-owner tries to delete', async () => {
    const other = seededUsers[1];
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'DELETE',
      headers: authHeaders(other.id),
    });
    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent activity', async () => {
    const user = seededUsers[0];
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'DELETE',
        headers: authHeaders(user.id),
      },
    );
    expect(res.status).toBe(404);
  });

  it('should return 204 and delete activity for owner', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'DELETE',
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(204);
  });

  it('should return 404 after deletion', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdActivityId}`, {
      method: 'DELETE',
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(404);
  });
});
