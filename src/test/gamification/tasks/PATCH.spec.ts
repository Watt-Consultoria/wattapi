import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/tasks';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /gamification/tasks/:id', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Updates title and points of a task', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Task',
        email: `tasks.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const task = await orchestrator.database.seed.createGamTask({
        title: 'Tarefa Original',
        points: 10,
        created_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ title: 'Tarefa Atualizada', points: 30 }),
      });
      const body = (await response.json()) as {
        id: string;
        title: string;
        points: number;
      };

      expect(response.status).toBe(200);
      expect(body.id).toBe(task.id);
      expect(body.title).toBe('Tarefa Atualizada');
      expect(body.points).toBe(30);
    });

    test('Deactivates a task', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Deactivate Task',
        email: `tasks.patch.deactivate.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ is_active: false }),
      });
      const body = (await response.json()) as { is_active: boolean };

      expect(response.status).toBe(200);
      expect(body.is_active).toBe(false);
    });

    test('Returns 404 for non-existent task', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Task 404',
        email: `tasks.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assessor.token}`,
          },
          body: JSON.stringify({ title: 'x' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor For Consultor Patch',
        email: `tasks.patch.cons.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Patch Task Forbidden',
        email: `tasks.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ title: 'Proibido' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
