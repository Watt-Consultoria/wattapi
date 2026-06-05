import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/submissions';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /gamification/submissions', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns 400 when no active cycle exists', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub No Cycle First',
        email: `sub.post.nocycle.first.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No Cycle First',
        email: `sub.post.nocycle.first.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, houses[0].id);
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const filePath = await orchestrator.database.seed.uploadGamificationFile(
        consultor.id,
        `proof-nocycle-first-${Date.now()}.txt`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          description: 'Desc',
          file_path: filePath,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Submits a task completion with valid data', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub POST Seed',
        email: `sub.post.seed.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const lumina = houses.find((h) => h.name === 'Lumina')!;

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Submit',
        email: `sub.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, lumina.id);

      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const filePath = await orchestrator.database.seed.uploadGamificationFile(
        consultor.id,
        `proof-${Date.now()}.txt`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          description: 'Participei do vídeo em 04/06/2026',
          file_path: filePath,
        }),
      });
      const body = (await response.json()) as {
        id: string;
        task_id: string;
        house_id: string;
        cycle_id: string;
        status: string;
      };

      expect(response.status).toBe(201);
      expect(body.task_id).toBe(task.id);
      expect(body.house_id).toBe(lumina.id);
      expect(body.cycle_id).toBe(cycle.id);
      expect(body.status).toBe('pending');
    });

    test('Returns 400 when user has no house assigned', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub No House',
        email: `sub.post.nohouse.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No House',
        email: `sub.post.nohouse.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const filePath = await orchestrator.database.seed.uploadGamificationFile(
        consultor.id,
        `proof-nohouse-${Date.now()}.txt`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          description: 'Desc',
          file_path: filePath,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Returns 400 when task is inactive', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub Inactive Task',
        email: `sub.post.inactive.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Inactive Task',
        email: `sub.post.inactive.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, houses[0].id);
      await orchestrator.database.seed.createCycle({ created_by: assessor.id });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
        is_active: false,
      });
      const filePath = await orchestrator.database.seed.uploadGamificationFile(
        consultor.id,
        `proof-inactive-${Date.now()}.txt`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          description: 'Desc',
          file_path: filePath,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Returns 400 when file does not exist in storage', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub No File',
        email: `sub.post.nofile.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No File',
        email: `sub.post.nofile.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, houses[0].id);
      await orchestrator.database.seed.createCycle({ created_by: assessor.id });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({
          task_id: task.id,
          description: 'Desc',
          file_path: 'proofs/fake/nonexistent.txt',
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Allows the same task to be submitted multiple times', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub Multiple',
        email: `sub.post.multi.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Multiple Submissions',
        email: `sub.post.multi.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, houses[0].id);
      await orchestrator.database.seed.createCycle({ created_by: assessor.id });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });

      const makeSubmission = async () => {
        const filePath =
          await orchestrator.database.seed.uploadGamificationFile(
            consultor.id,
            `proof-multi-${Date.now()}.txt`,
          );
        return fetch(BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${consultor.token}`,
          },
          body: JSON.stringify({
            task_id: task.id,
            description: 'Desc',
            file_path: filePath,
          }),
        });
      };

      const r1 = await makeSubmission();
      const r2 = await makeSubmission();

      expect(r1.status).toBe(201);
      expect(r2.status).toBe(201);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: 'x',
          description: 'x',
          file_path: 'x',
        }),
      });
      expect(response.status).toBe(401);
    });
  });
});
