import * as jwt from 'jsonwebtoken';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

const BASE_URL = 'http://localhost:3000/auth/me';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function signToken(
  payload: Record<string, unknown>,
  options?: jwt.SignOptions,
): string {
  return jwt.sign(payload, JWT_SECRET, options);
}

let seededUsers: SeedUser[] = [];

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
  await orchestrator.end();
});

describe('GET /auth/me', () => {
  it('should return HTTP 401 when Authorization header is missing', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 401 when Authorization header has no Bearer prefix', async () => {
    const token = signToken({ sub: seededUsers[0].id });
    const res = await fetch(BASE_URL, {
      headers: { Authorization: token },
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 401 when token has invalid signature', async () => {
    const token = jwt.sign(
      { sub: seededUsers[0].id },
      'wrong-secret-key-that-is-long-enough-to-pass',
    );
    const res = await fetch(BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 401 when token is expired', async () => {
    const token = signToken({
      sub: seededUsers[0].id,
      exp: Math.floor(Date.now() / 1000) - 60,
    });
    const res = await fetch(BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 401 when token sub has no matching user in public.users', async () => {
    const token = signToken({ sub: '00000000-0000-0000-0000-000000000001' });
    const res = await fetch(BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 401 when user is inactive', async () => {
    const inactiveUser = seededUsers[5];
    const presidenteToken = signToken({ sub: seededUsers[4].id });
    await fetch(`http://localhost:3000/users/${inactiveUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${presidenteToken}` },
    });

    const token = signToken({ sub: inactiveUser.id });
    const res = await fetch(BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 with full UserResponse for a valid token and active user', async () => {
    const target = seededUsers[0];
    const token = signToken({ sub: target.id });
    const res = await fetch(BASE_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(body.id).toBe(target.id);
    expect(body.email).toBe(target.email);
    expect(body.name).toBe(target.name);
    expect(body.role).toBe(target.role);
    expect(body.sector).toBe(target.sector);
    expect(body.cpf).toBe(target.cpf);
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');
    expect(new Date(body.created_at).toISOString()).toBe(body.created_at);
    expect(new Date(body.updated_at).toISOString()).toBe(body.updated_at);
  });
});
