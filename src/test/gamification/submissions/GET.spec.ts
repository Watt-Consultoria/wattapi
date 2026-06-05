import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/submissions';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /gamification/submissions', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Sees only own submissions', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub GET Seed',
        email: `sub.get.seed.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Sub GET',
        email: `sub.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(consultor.id, houses[0].id);

      const other = await orchestrator.database.seed.createUser({
        username: 'Other Sub GET',
        email: `sub.get.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.assignHouse(other.id, houses[1].id);

      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const fp1 = await orchestrator.database.seed.uploadGamificationFile(
        consultor.id,
        `own-${Date.now()}.txt`,
      );
      const fp2 = await orchestrator.database.seed.uploadGamificationFile(
        other.id,
        `other-${Date.now()}.txt`,
      );

      const mySub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: consultor.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp1,
      });
      await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: other.id,
        house_id: houses[1].id,
        cycle_id: cycle.id,
        file_path: fp2,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as { id: string; user_id: string }[];

      expect(response.status).toBe(200);
      expect(body.every((s) => s.user_id === consultor.id)).toBe(true);
      expect(body.some((s) => s.id === mySub.id)).toBe(true);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Can filter by status=pending', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub Filter Status',
        email: `sub.get.status.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Member Sub Filter',
        email: `sub.get.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(member.id, houses[0].id);
      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const fp = await orchestrator.database.seed.uploadGamificationFile(
        member.id,
        `filter-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      const response = await fetch(`${BASE_URL}?status=pending`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as { id: string; status: string }[];

      expect(response.status).toBe(200);
      expect(body.every((s) => s.status === 'pending')).toBe(true);
      expect(body.some((s) => s.id === sub.id)).toBe(true);
    });

    test('Can filter by user_id', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Sub Filter User',
        email: `sub.get.userid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Member Sub Filter User',
        email: `sub.get.userid.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(member.id, houses[0].id);
      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
      });
      const fp = await orchestrator.database.seed.uploadGamificationFile(
        member.id,
        `uid-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      const response = await fetch(`${BASE_URL}?user_id=${member.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as { id: string; user_id: string }[];

      expect(response.status).toBe(200);
      expect(body.every((s) => s.user_id === member.id)).toBe(true);
      expect(body.some((s) => s.id === sub.id)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
