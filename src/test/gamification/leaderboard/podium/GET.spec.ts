import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/leaderboard/podium';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /gamification/leaderboard/podium', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns individual ranking for a house', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Podium',
        email: `podium.get.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const voltus = houses.find((h) => h.name === 'Voltus')!;

      const member = await orchestrator.database.seed.createUser({
        username: 'Member Podium',
        email: `podium.get.member.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.assignHouse(member.id, voltus.id);

      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const task = await orchestrator.database.seed.createGamTask({
        created_by: assessor.id,
        points: 15,
      });
      const fp = await orchestrator.database.seed.uploadGamificationFile(
        member.id,
        `podium-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: voltus.id,
        cycle_id: cycle.id,
        file_path: fp,
      });

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

      const caller = await orchestrator.database.seed.createUser({
        username: 'Consultor Podium GET',
        email: `podium.get.caller.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}?house_id=${voltus.id}`, {
        headers: { Authorization: `Bearer ${caller.token}` },
      });
      const body = (await response.json()) as {
        user_id: string;
        user_name: string;
        points_contributed: number;
        approved_count: number;
      }[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const memberEntry = body.find((e) => e.user_id === member.id);
      expect(memberEntry?.points_contributed).toBe(15);
      expect(memberEntry?.approved_count).toBe(1);
    });

    test('Returns empty array when house has no approved submissions', async () => {
      const houses = await orchestrator.database.seed.getHouses();
      const nexus = houses.find((h) => h.name === 'Nexus')!;
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Podium Empty',
        email: `podium.empty.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createCycle({ created_by: assessor.id });

      const caller = await orchestrator.database.seed.createUser({
        username: 'Consultor Podium Empty',
        email: `podium.empty.caller.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}?house_id=${nexus.id}`, {
        headers: { Authorization: `Bearer ${caller.token}` },
      });
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    test('Returns 400 when house_id is missing', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Podium No House',
        email: `podium.nohouse.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(`${BASE_URL}?house_id=some-id`);
      expect(response.status).toBe(401);
    });
  });
});
