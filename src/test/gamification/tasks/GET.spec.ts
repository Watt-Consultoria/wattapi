import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/tasks';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /gamification/tasks', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns only active tasks', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Tasks Seed',
        email: `tasks.get.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const active = await orchestrator.database.seed.createGamTask({
        title: 'Tarefa Ativa',
        created_by: assessor.id,
        is_active: true,
      });
      const inactive = await orchestrator.database.seed.createGamTask({
        title: 'Tarefa Inativa',
        created_by: assessor.id,
        is_active: false,
      });

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Tasks GET',
        email: `tasks.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        id: string;
        is_active: boolean;
      }[];

      expect(response.status).toBe(200);
      expect(body.some((t) => t.id === active.id)).toBe(true);
      expect(body.some((t) => t.id === inactive.id)).toBe(false);
      expect(body.every((t) => t.is_active === true)).toBe(true);
    });

    test('Ignores include_inactive=true (consultor sees only active)', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Tasks Active Filter',
        email: `tasks.get.filter.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const inactive = await orchestrator.database.seed.createGamTask({
        title: 'Inativa Ignorada',
        created_by: assessor.id,
        is_active: false,
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Ignore Filter',
        email: `tasks.get.filter.cons.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}?include_inactive=true`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as { id: string }[];

      expect(response.status).toBe(200);
      expect(body.some((t) => t.id === inactive.id)).toBe(false);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Returns all tasks including inactive with include_inactive=true', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Tasks All',
        email: `tasks.get.all.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const inactive = await orchestrator.database.seed.createGamTask({
        title: 'Inativa Superuser',
        created_by: assessor.id,
        is_active: false,
      });

      const response = await fetch(`${BASE_URL}?include_inactive=true`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as { id: string }[];

      expect(response.status).toBe(200);
      expect(body.some((t) => t.id === inactive.id)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
