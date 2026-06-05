import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/tasks';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /gamification/tasks', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Creates a task with valid data', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Task',
        email: `tasks.post.assessor.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({
          title: 'Participar de vídeo marketing',
          description: 'Aparecer em um vídeo do marketing da Watt',
          points: 50,
        }),
      });
      const body = (await response.json()) as {
        id: string;
        title: string;
        points: number;
        is_active: boolean;
      };

      expect(response.status).toBe(201);
      expect(body.title).toBe('Participar de vídeo marketing');
      expect(body.points).toBe(50);
      expect(body.is_active).toBe(true);
    });

    test('Returns 400 when points is zero or negative', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Bad Points',
        email: `tasks.post.badpoints.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({
          title: 'Tarefa',
          description: 'Desc',
          points: 0,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Returns 400 when required fields are missing', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Task Missing Fields',
        email: `tasks.post.missing.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({ title: 'Apenas título' }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Task Forbidden',
        email: `tasks.post.consultor.${Date.now()}@watt-test.com`,
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
        body: JSON.stringify({ title: 'T', description: 'D', points: 10 }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'T', description: 'D', points: 10 }),
      });
      expect(response.status).toBe(401);
    });
  });
});
