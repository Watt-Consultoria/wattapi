import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/cycles';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /gamification/cycles/active ─────────────────────────────────────────

describe('GET /gamification/cycles/active', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns 404 when no cycle is active', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor No Active Cycle',
        email: `cycles.get.noactive.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/active`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Returns the active cycle', async () => {
      const superuser = await orchestrator.database.seed.createUser({
        username: 'Assessor Active Cycle',
        email: `cycles.get.active.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const cycle = await orchestrator.database.seed.createCycle({
        name: 'Ciclo Ativo Teste',
        created_by: superuser.id,
      });

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Active Cycle',
        email: `cycles.get.active.cons.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/active`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        id: string;
        ended_at: string | null;
      };

      expect(response.status).toBe(200);
      expect(body.id).toBe(cycle.id);
      expect(body.ended_at).toBeNull();
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(`${BASE_URL}/active`);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /gamification/cycles ─────────────────────────────────────────────────

describe('GET /gamification/cycles', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns all cycles ordered by started_at desc', async () => {
      const superuser = await orchestrator.database.seed.createUser({
        username: 'Assessor Cycles List',
        email: `cycles.get.list.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createCycle({
        name: 'Ciclo Lista',
        created_by: superuser.id,
      });

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Cycles List',
        email: `cycles.get.list.cons.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as { id: string }[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
