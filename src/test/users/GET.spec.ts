import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/users';

type UserBody = {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf?: string;
  created_at: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /users ───────────────────────────────────────────────────────────────

describe('GET /users', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving all users', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Users',
        email: `users.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as UserBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('id');
      expect(body[0]).toHaveProperty('email');
      expect(body[0]).toHaveProperty('name');
      expect(body[0]).toHaveProperty('role');
      expect(body[0]).toHaveProperty('sector');
      expect(body[0]).not.toHaveProperty('cpf');
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving all users', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Users',
        email: `users.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as UserBody[];

      expect(response.status).toBe(200);
      expect(body[0]).not.toHaveProperty('cpf');
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving all users', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor GET Users',
        email: `users.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as UserBody[];

      expect(response.status).toBe(200);
      expect(body[0]).toHaveProperty('cpf');
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving all users', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Users',
        email: `users.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as UserBody[];

      expect(response.status).toBe(200);
      expect(body[0]).toHaveProperty('cpf');
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving all users', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Users',
        email: `users.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as UserBody[];

      expect(response.status).toBe(200);
      expect(body[0]).toHaveProperty('cpf');
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list users', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /users/:id ───────────────────────────────────────────────────────────

describe('GET /users/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving another user', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET By ID Caller',
        email: `users.getbyid.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target User',
        email: `users.getbyid.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(target.id);
      expect(body.email).toBe(target.email);
      expect(body).not.toHaveProperty('cpf');
    });

    test('Retrieving own profile', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Self',
        email: `users.getbyid.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${consultor.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(consultor.id);
      expect(body).toHaveProperty('cpf');
    });

    test('Attempting to retrieve a non-existent user', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor 404',
        email: `users.getbyid.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving another user', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET By ID',
        email: `users.getbyid.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Gerente Target',
        email: `users.getbyid.gerente.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).not.toHaveProperty('cpf');
    });

    test('Retrieving own profile', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Self',
        email: `users.getbyid.gerente.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${gerente.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Attempting to retrieve a non-existent user', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente 404',
        email: `users.getbyid.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${gerente.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving another user', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor GET By ID',
        email: `users.getbyid.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Diretor Target',
        email: `users.getbyid.diretor.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Retrieving own profile', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Self',
        email: `users.getbyid.diretor.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Attempting to retrieve a non-existent user', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor 404',
        email: `users.getbyid.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${diretor.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving another user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET By ID',
        email: `users.getbyid.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Assessor Target',
        email: `users.getbyid.assessor.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Retrieving own profile', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Self',
        email: `users.getbyid.assessor.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${assessor.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Attempting to retrieve a non-existent user', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor 404',
        email: `users.getbyid.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${assessor.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving another user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET By ID',
        email: `users.getbyid.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Presidente Target',
        email: `users.getbyid.presidente.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Retrieving own profile', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Self',
        email: `users.getbyid.presidente.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${presidente.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('cpf');
    });

    test('Attempting to retrieve a non-existent user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente 404',
        email: `users.getbyid.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${presidente.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve a user without token', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(401);
    });
  });
});
