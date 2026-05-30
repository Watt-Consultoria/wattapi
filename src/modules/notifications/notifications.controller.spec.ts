import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import { config } from 'dotenv';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

config({
  path: path.resolve(__dirname, '../../..', '.env.development'),
  quiet: true,
});

const BASE_URL = 'http://localhost:3001/notifications';
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

// Seed users:
// [0] Ana Silva      — consultor,  comercial
// [1] Carlos Santos  — gerente,    projetos
// [2] Maria Oliveira — diretor,    executivo
// [3] João Assessor  — assessor,   institucional
// [4] Lucia Pres.    — presidente, executivo

let seededUsers: SeedUser[] = [];
let createdNotifId: string;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

// ─── GET /notifications ───────────────────────────────────────────────────────

describe('GET /notifications', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return 200 with empty array when user has no notifications', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, { headers: authHeaders(user.id) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─── POST /notifications ──────────────────────────────────────────────────────

describe('POST /notifications', () => {
  it('should return 401 without token', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Aviso', target: {} }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-superuser (consultor)', async () => {
    const user = seededUsers[0]; // consultor, rank 0
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({ title: 'Aviso', target: {} }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 403 for non-superuser (gerente)', async () => {
    const user = seededUsers[1]; // gerente, rank 1
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(user.id),
      body: JSON.stringify({ title: 'Aviso', target: {} }),
    });
    expect(res.status).toBe(403);
  });

  it('should return 400 when title is missing', async () => {
    const assessor = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(assessor.id),
      body: JSON.stringify({ target: {} }),
    });
    expect(res.status).toBe(400);
  });

  it('should return 201 and create notifications for all users (empty target)', async () => {
    const assessor = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(assessor.id),
      body: JSON.stringify({ title: 'Aviso geral', target: {} }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { count: number };
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThan(0);
  });

  it('should filter by sector', async () => {
    const presidente = seededUsers[4];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(presidente.id),
      body: JSON.stringify({
        title: 'Aviso comercial',
        target: { sector: 'comercial' },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBeGreaterThanOrEqual(1);
  });

  it('should return count 0 when no users match the target', async () => {
    const assessor = seededUsers[3];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(assessor.id),
      body: JSON.stringify({
        title: 'Aviso',
        target: { sector: 'setor-inexistente-xyz' },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { count: number };
    expect(body.count).toBe(0);
  });
});

// ─── DELETE /notifications/:id ────────────────────────────────────────────────

describe('DELETE /notifications/:id', () => {
  beforeAll(async () => {
    // Create a notification for user[0] via superuser POST
    const assessor = seededUsers[3];
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: jsonHeaders(assessor.id),
      body: JSON.stringify({
        title: 'Para deletar',
        target: { sector: user.sector, role: user.role },
      }),
    });
    const body = (await res.json()) as { count: number };
    expect(body.count).toBeGreaterThan(0);

    // Get the notification id
    const listRes = await fetch(BASE_URL, {
      headers: authHeaders(user.id),
    });
    const notifications = (await listRes.json()) as { id: string }[];
    createdNotifId = notifications[0].id;
  });

  it('should return 401 without token', async () => {
    const res = await fetch(`${BASE_URL}/${createdNotifId}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('should return 403 when trying to delete another user notification', async () => {
    const otherUser = seededUsers[1];
    const res = await fetch(`${BASE_URL}/${createdNotifId}`, {
      method: 'DELETE',
      headers: authHeaders(otherUser.id),
    });
    expect(res.status).toBe(403);
  });

  it('should return 204 when owner deletes their notification', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdNotifId}`, {
      method: 'DELETE',
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(204);
  });

  it('should not return deleted notification in GET /notifications', async () => {
    const user = seededUsers[0];
    const res = await fetch(BASE_URL, { headers: authHeaders(user.id) });
    const notifications = (await res.json()) as { id: string }[];
    const found = notifications.find((n) => n.id === createdNotifId);
    expect(found).toBeUndefined();
  });

  it('should return 404 for already-deleted notification', async () => {
    const user = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${createdNotifId}`, {
      method: 'DELETE',
      headers: authHeaders(user.id),
    });
    expect(res.status).toBe(404);
  });

  it('should return 404 for non-existent id', async () => {
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
});
