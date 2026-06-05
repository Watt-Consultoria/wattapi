import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/leaderboard';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /gamification/leaderboard', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns 404 when no active cycle and no cycle_id param', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leaderboard No Cycle',
        email: `leaderboard.get.nocycle.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Returns house standings for active cycle', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Leaderboard',
        email: `leaderboard.get.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const lumina = houses.find((h) => h.name === 'Lumina')!;

      const member = await orchestrator.database.seed.createUser({
        username: 'Member Leaderboard',
        email: `leaderboard.get.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(member.id, lumina.id);

      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
        points: 25,
      });
      const fp = await orchestrator.database.seed.uploadGamificationFile(
        member.id,
        `lb-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: lumina.id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      // Approve the submission directly in DB
      await orchestrator.database.seed.createUser({
        username: 'Reviewer Leaderboard',
        email: `leaderboard.reviewer.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      // Approve submission via API
      await fetch(
        `http://localhost:3001/gamification/submissions/${sub.id}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assessor.token}`,
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Leaderboard GET',
        email: `leaderboard.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as {
        house_id: string;
        house_name: string;
        total_points: number;
      }[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(3);
      const luminaEntry = body.find((h) => h.house_id === lumina.id);
      expect(luminaEntry?.total_points).toBe(25);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
