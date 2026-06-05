import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/cycles';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /gamification/cycles/:id/close', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Closes an active cycle with no pending submissions', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Close Cycle',
        email: `cycles.patch.close.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });

      const response = await fetch(`${BASE_URL}/${cycle.id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as { id: string; ended_at: string };

      expect(response.status).toBe(200);
      expect(body.id).toBe(cycle.id);
      expect(body.ended_at).not.toBeNull();
    });

    test('Returns 409 when there are pending submissions', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Close Blocked',
        email: `cycles.patch.blocked.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Membro Blocked Cycle',
        email: `cycles.patch.member.${Date.now()}@watt-test.com`,
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
      const filePath = await orchestrator.database.seed.uploadGamificationFile(
        member.id,
        `proof-blocked-${Date.now()}.txt`,
      );
      await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: filePath,
      });

      const response = await fetch(`${BASE_URL}/${cycle.id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(409);
    });

    test('Returns 409 when cycle is already closed', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Close Already Closed',
        email: `cycles.patch.already.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });

      await fetch(`${BASE_URL}/${cycle.id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const response = await fetch(`${BASE_URL}/${cycle.id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor For Consultor Close',
        email: `cycles.patch.cons.sup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const cycle = await orchestrator.database.seed.createCycle({
        created_by: assessor.id,
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Close Forbidden',
        email: `cycles.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${cycle.id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/close`,
        { method: 'PATCH' },
      );
      expect(response.status).toBe(401);
    });
  });
});
