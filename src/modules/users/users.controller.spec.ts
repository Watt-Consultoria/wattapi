import orchestrator from '../../lib/orchestrator';
import type { SeedUser } from '../../lib/seed';

const BASE_URL = 'http://localhost:3000/users';

let seededUsers: SeedUser[] = [];

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  seededUsers = await orchestrator.seedDatabase();
});

afterAll(async () => {
  await orchestrator.clearDatabase();
});

describe('GET /users', () => {
  it('should return HTTP 200', async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(200);
  });

  it('should return Content-Type application/json', async () => {
    const res = await fetch(BASE_URL);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('should return an array', async () => {
    const res = await fetch(BASE_URL);
    const body: unknown = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('should return at least the seeded users', async () => {
    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    expect(body.length).toBeGreaterThanOrEqual(seededUsers.length);
  });

  it('should return users with the correct shape', async () => {
    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('sector');
    expect(user).toHaveProperty('cpf');
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
  });

  it('should return users with valid field types', async () => {
    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.sector).toBe('string');
    expect(typeof user.cpf).toBe('string');
  });

  it('should return users with valid ISO 8601 created_at and updated_at', async () => {
    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    const user = body[0];

    expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
    expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
  });

  it('should include all seeded users in the response', async () => {
    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    const returnedIds = body.map((u) => u.id);

    for (const seeded of seededUsers) {
      expect(returnedIds).toContain(seeded.id);
    }
  });
});

describe('GET /users/:user_id', () => {
  it('should return HTTP 200 for an existing user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    expect(res.status).toBe(200);
  });

  it('should return Content-Type application/json', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('should return the correct user shape', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    const user = (await res.json()) as SeedUser;

    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('sector');
    expect(user).toHaveProperty('cpf');
    expect(user).toHaveProperty('created_at');
    expect(user).toHaveProperty('updated_at');
  });

  it('should return the user matching the requested id', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`);
    const user = (await res.json()) as SeedUser;

    expect(user.id).toBe(target.id);
  });

  it('should return the correct user data', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`);
    const user = (await res.json()) as SeedUser;

    expect(user.email).toBe(target.email);
    expect(user.name).toBe(target.name);
    expect(user.role).toBe(target.role);
    expect(user.sector).toBe(target.sector);
    expect(user.cpf).toBe(target.cpf);
  });

  it('should return valid field types', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    const user = (await res.json()) as SeedUser;

    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.sector).toBe('string');
    expect(typeof user.cpf).toBe('string');
  });

  it('should return valid ISO 8601 created_at and updated_at', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`);
    const user = (await res.json()) as SeedUser;

    expect(new Date(user.created_at).toISOString()).toBe(user.created_at);
    expect(new Date(user.updated_at).toISOString()).toBe(user.updated_at);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(`${BASE_URL}/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });
});

describe('POST /users', () => {
  const validPayload = {
    email: 'novo.usuario@watt.com',
    name: 'Novo Usuario',
    role: 'gerente',
    sector: 'comercial',
    cpf: '55566677788',
  };

  it('should return HTTP 201 and the created user with the correct shape', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email', validPayload.email);
    expect(body).toHaveProperty('name', validPayload.name);
    expect(body).toHaveProperty('role', validPayload.role);
    expect(body).toHaveProperty('sector', validPayload.sector);
    expect(body).toHaveProperty('cpf', validPayload.cpf);
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');
  });

  it('should return created_at and updated_at as valid ISO 8601 strings', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        email: 'iso.test@watt.com',
        cpf: '44455566677',
      }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(201);
    expect(new Date(body.created_at).toISOString()).toBe(body.created_at);
    expect(new Date(body.updated_at).toISOString()).toBe(body.updated_at);
  });

  it('should default role to "consultor" when omitted', async () => {
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role: _role, ...withoutRole } = validPayload;
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...withoutRole,
        email: 'sem.role@watt.com',
        cpf: '99988877766',
      }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(201);
    expect(body.role).toBe('consultor');
  });

  it('should return HTTP 400 when a required field is missing', async () => {
    //eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email: _email, ...withoutEmail } = validPayload;
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withoutEmail),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid email format', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid role value', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, role: 'invalid-role' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid sector value', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, sector: 'invalid-sector' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid CPF format', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, cpf: '123' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 409 for a duplicate email', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, email: seededUsers[0].email }),
    });

    expect(res.status).toBe(409);
  });

  it('should return HTTP 409 for a duplicate CPF', async () => {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validPayload, cpf: seededUsers[0].cpf }),
    });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /users/:id', () => {
  it('should return HTTP 200 and the updated user with the altered field', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nome Atualizado' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(body.id).toBe(target.id);
    expect(body.name).toBe('Nome Atualizado');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('role');
    expect(body).toHaveProperty('sector');
    expect(body).toHaveProperty('cpf');
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');
  });

  it('should only change the provided fields and preserve the rest', async () => {
    const target = seededUsers[1];
    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Apenas Nome' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(body.name).toBe('Apenas Nome');
    expect(body.email).toBe(target.email);
    expect(body.role).toBe(target.role);
    expect(body.sector).toBe(target.sector);
    expect(body.cpf).toBe(target.cpf);
  });

  it('should return an updated_at >= the previous updated_at', async () => {
    const target = seededUsers[2];
    const before = new Date(target.updated_at).getTime();

    const res = await fetch(`${BASE_URL}/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Timestamp Test' }),
    });
    const body = (await res.json()) as SeedUser;

    expect(res.status).toBe(200);
    expect(new Date(body.updated_at).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should return HTTP 400 for an empty body {}', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid email', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid role', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'invalid-role' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid sector', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector: 'invalid-sector' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 400 for an invalid CPF format', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: '123' }),
    });

    expect(res.status).toBe(400);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ghost' }),
      },
    );

    expect(res.status).toBe(404);
  });

  it('should return HTTP 409 when email already belongs to another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: seededUsers[1].email }),
    });

    expect(res.status).toBe(409);
  });

  it('should return HTTP 409 when cpf already belongs to another user', async () => {
    const res = await fetch(`${BASE_URL}/${seededUsers[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: seededUsers[1].cpf }),
    });

    expect(res.status).toBe(409);
  });
});

describe('DELETE /users/:id', () => {
  it('should return HTTP 204 with no body for an existing user', async () => {
    const target = seededUsers[0];
    const res = await fetch(`${BASE_URL}/${target.id}`, { method: 'DELETE' });

    expect(res.status).toBe(204);
    const text = await res.text();
    expect(text).toBe('');
  });

  it('should return HTTP 404 on GET /users/:id after DELETE (user invisible via API)', async () => {
    const target = seededUsers[0];
    await fetch(`${BASE_URL}/${target.id}`, { method: 'DELETE' });

    const res = await fetch(`${BASE_URL}/${target.id}`);
    expect(res.status).toBe(404);
  });

  it('should no longer list the deleted user in GET /users', async () => {
    const target = seededUsers[1];
    await fetch(`${BASE_URL}/${target.id}`, { method: 'DELETE' });

    const res = await fetch(BASE_URL);
    const body = (await res.json()) as SeedUser[];
    const ids = body.map((u) => u.id);

    expect(ids).not.toContain(target.id);
  });

  it('should return HTTP 404 for a non-existent user id', async () => {
    const res = await fetch(
      `${BASE_URL}/00000000-0000-0000-0000-000000000000`,
      {
        method: 'DELETE',
      },
    );

    expect(res.status).toBe(404);
  });
});
