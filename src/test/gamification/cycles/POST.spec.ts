import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/cycles';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /gamification/cycles', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Creates a new cycle when none is active', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Cycle',
        email: `cycles.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: '1º Semestre 2026' }),
      });
      const body = (await response.json()) as {
        id: string;
        name: string;
        ended_at: string | null;
      };

      expect(response.status).toBe(201);
      expect(body.name).toBe('1º Semestre 2026');
      expect(body.ended_at).toBeNull();
    });

    test('Returns 409 when an active cycle already exists', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Conflict Cycle',
        email: `cycles.post.conflict.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createCycle({ created_by: assessor.id });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'Segundo Ciclo' }),
      });
      expect(response.status).toBe(409);
    });

    test('Returns 400 when name is missing', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Cycle Bad Input',
        email: `cycles.post.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Cycle Forbidden',
        email: `cycles.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ name: 'Ciclo Proibido' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ciclo Sem Auth' }),
      });
      expect(response.status).toBe(401);
    });
  });
});
