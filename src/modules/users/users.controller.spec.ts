import * as jwt from 'jsonwebtoken';
import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

const BASE_URL = 'http://localhost:3000/users';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

function signToken(email: string): string {
  return jwt.sign({ email, sub: 'test-sub' }, JWT_SECRET);
}

function authHeaders(email: string) {
  return { Authorization: `Bearer ${signToken(email)}` };
}

let seededUsers: SeedUser[] = [];

// seededUsers indices by role:
// [0] consultor  — ana.silva@watt.com
// [1] gerente    — carlos.santos@watt.com
// [2] diretor    — maria.oliveira@watt.com
// [3] assessor   — joao.assessor@watt.com
// [4] presidente — lucia.presidente@watt.com

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
});

describe('GET /users', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    expect(res.status).toBe(200);
  });

  it('should return Content-Type application/json', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('should return an array', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should return at least the seeded users', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body = (await res.json()) as SeedUser[];
    expect(body.length).toBeGreaterThanOrEqual(seededUsers.length);
  });

  it('should return users with the correct shape', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('sector');
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
  });

  it('should return users with valid field types', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.sector).toBe('string');
  });

  it('should return users with valid ISO 8601 created_at and updated_at', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
    expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
  });

  it('should include all seeded users in the response', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email),
    });
    const body = (await res.json()) as SeedUser[];
    const returnedIds = body.map((u) => u.id);

    for (const seeded of seededUsers) {
      expect(returnedIds).toContain(seeded.id);
    }
  });

  it('should omit cpf for consultor caller', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[0].email), // consultor
    });
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body[0]).not.toHaveProperty('cpf');
  });

  it('should omit cpf for gerente caller', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[1].email), // gerente
    });
    const body = (await res.json()) as Record<string, unknown>[];
    expect(body[0]).not.toHaveProperty('cpf');
  });

  it('should include cpf for diretor caller', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[2].email), // diretor
    });
    const body = (await res.json()) as SeedUser[];
    expect(body[0]).toHaveProperty('cpf');
  });

  it('should include cpf for assessor caller', async () => {
    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[3].email), // assessor
    });
    const body = (await res.json()) as SeedUser[];
    expect(body[0]).toHaveProperty('cpf');
  });
});

describe('GET /users/:user_id', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 for an existing user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    expect(res.status).toBe(200);
  });

  it('should return Content-Type application/json', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('should return the correct user shape', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    const user = (await res.json()) as SeedUser;

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('sector');
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
  });

  it('should return the user matching the requested id', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    const user = (await res.json()) as SeedUser;
    expect(user.id).toBe(target.id);
  });

  it('should return the correct user data', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    const user = (await res.json()) as SeedUser;

    expect(user.email).toBe(target.email);
    expect(user.name).toBe(target.name);
    expect(user.role).toBe(target.role);
    expect(user.sector).toBe(target.sector);
  });

  it('should return valid field types', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    const user = (await res.json()) as SeedUser;

    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.sector).toBe('string');
  });

  it('should return valid ISO 8601 created_at and updated_at', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[0].email),
    });
    const user = (await res.json()) as SeedUser;

    expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
    expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        headers: authHeaders(seededUsers[0].email),
      },
    );
    expect(res.status).toBe(404);
  });

  it('should omit cpf for gerente viewing another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[2].id}`, {
      headers: authHeaders(seededUsers[1].email), // gerente viewing diretor
    });
    const user = (await res.json()) as Record<string, unknown>;
    expect(user).not.toHaveProperty('cpf');
  });

  it('should include cpf for gerente viewing own profile (selfBypass)', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[1].id}`, {
      headers: authHeaders(seededUsers[1].email), // gerente viewing self
    });
    const user = (await res.json()) as Record<string, unknown>;
    expect(user).toHaveProperty('cpf');
  });

  it('should include cpf for diretor viewing any profile', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      headers: authHeaders(seededUsers[2].email), // diretor viewing consultor
    });
    const user = (await res.json()) as Record<string, unknown>;
    expect(user).toHaveProperty('cpf');
  });
});

describe('POST /users', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sem.token@watt.com',
        name: 'Sem Token',
        sector: 'comercial',
        cpf: '11122233300',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 when email in body differs from caller email', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].email), // ana.silva
      },
      body: JSON.stringify({
        email: 'outro.email@watt.com',
        name: 'Tentativa',
        sector: 'comercial',
        cpf: '33344455566',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 400 when a required field is missing', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].email),
      },
      body: JSON.stringify({
        name: 'Sem Email',
        sector: 'comercial',
        cpf: '11122200099',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid email format', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].email),
      },
      body: JSON.stringify({
        email: 'not-an-email',
        name: 'Invalid',
        sector: 'comercial',
        cpf: '11122200099',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 409 for a duplicate email', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[0].email),
      },
      body: JSON.stringify({
        email: seededUsers[0].email,
        name: 'Duplicate',
        sector: 'comercial',
        cpf: '77766600011',
      }),
    });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /users/:id', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sem Token' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 200 and the updated user — presidente editing consultor', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email), // presidente
      },
      body: JSON.stringify({ name: 'Nome Atualizado' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(body.id).toBe(target.id);
    expect(body.name).toBe('Nome Atualizado');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('role');
    expect(body).toHaveProperty('sector');
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');
  });

  it('should only change the provided fields and preserve the rest', async () => {
    const target = seededUsers[1];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email), // presidente
      },
      body: JSON.stringify({ name: 'Apenas Nome' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(body.name).toBe('Apenas Nome');
    expect(body.email).toBe(target.email);
    expect(body.role).toBe(target.role);
    expect(body.sector).toBe(target.sector);
  });

  it('should return an updated_at >= the previous updated_at', async () => {
    const target = seededUsers[2];
    const before = new Date(target.updated_at).getTime();

    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email), // presidente
      },
      body: JSON.stringify({ name: 'Timestamp Test' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(new Date(body.updated_at).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should allow gerente to edit own name', async () => {
    const target = seededUsers[1]; // gerente
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].email),
      },
      body: JSON.stringify({ name: 'Gerente Auto-edit' }),
    });
    expect(res.status).toBe(200);
  });

  it('should return HTTP 403 for gerente trying to edit another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[2].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].email), // gerente editing diretor
      },
      body: JSON.stringify({ name: 'Tentativa' }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 for regular user sending a restricted field (role)', async () => {
    const target = seededUsers[1]; // gerente editing self
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].email),
      },
      body: JSON.stringify({ role: 'diretor' }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 for regular user sending a restricted field (sector)', async () => {
    const target = seededUsers[1];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[1].email),
      },
      body: JSON.stringify({ sector: 'executivo' }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 for assessor trying to edit presidente', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[4].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[3].email), // assessor editing presidente
      },
      body: JSON.stringify({ name: 'Tentativa' }),
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 400 for an empty body {}', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid email', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid role', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ role: 'invalid-role' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid sector', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ sector: 'invalid-sector' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid CPF format', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ cpf: '123' }),
    });
    expect(res.status).toBe(400);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(seededUsers[4].email),
        },
        body: JSON.stringify({ name: 'Ghost' }),
      },
    );
    expect(res.status).toBe(404);
  });

  it('should return HTTP 409 when email already belongs to another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ email: seededUsers[1].email }),
    });
    expect(res.status).toBe(409);
  });

  it('should return HTTP 409 when cpf already belongs to another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(seededUsers[4].email),
      },
      body: JSON.stringify({ cpf: seededUsers[1].cpf }),
    });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /users/:id', () => {
  it('should return HTTP 401 when no token is provided', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(401);
  });

  it('should return HTTP 403 for a regular user (consultor)', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[1].id}`, {
      method: 'DELETE',
      headers: authHeaders(seededUsers[0].email), // consultor
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 for self-delete', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[4].id}`, {
      method: 'DELETE',
      headers: authHeaders(seededUsers[4].email), // presidente trying to delete self
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 403 when assessor tries to delete presidente', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[4].id}`, {
      method: 'DELETE',
      headers: authHeaders(seededUsers[3].email), // assessor → presidente
    });
    expect(res.status).toBe(403);
  });

  it('should return HTTP 204 with no body — presidente deleting consultor', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'DELETE',
      headers: authHeaders(seededUsers[4].email), // presidente
    });
    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe('');
  });

  it('should return HTTP 404 on GET /users/:id after DELETE (user invisible via API)', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      headers: authHeaders(seededUsers[2].email),
    });
    expect(res.status).toBe(404);
  });

  it('should no longer list the deleted user in GET /users', async () => {
    const target = seededUsers[1];
    await fetch(`${BASE_URL}/${target.id}`, {
      method: 'DELETE',
      headers: authHeaders(seededUsers[4].email),
    });

    const res = await fetch(BASE_URL, {
      headers: authHeaders(seededUsers[2].email),
    });
    const body = (await res.json()) as SeedUser[];
    const ids = body.map((u) => u.id);

    expect(ids).not.toContain(target.id);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'DELETE',
        headers: authHeaders(seededUsers[4].email),
      },
    );
    expect(res.status).toBe(404);
  });
});
