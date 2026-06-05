import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/gamification/submissions';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /gamification/submissions/:id/review', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Approves a pending submission', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Approve Sub',
        email: `sub.patch.approve.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Member Approve',
        email: `sub.patch.approve.member.${Date.now()}@watt-test.com`,
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
        `approve-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      const response = await fetch(`${BASE_URL}/${sub.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = (await response.json()) as {
        id: string;
        status: string;
        reviewed_by: string;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('approved');
      expect(body.reviewed_by).toBe(assessor.id);
    });

    test('Rejects a pending submission with reason', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Reject Sub',
        email: `sub.patch.reject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Member Reject',
        email: `sub.patch.reject.member.${Date.now()}@watt-test.com`,
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
        `reject-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      const response = await fetch(`${BASE_URL}/${sub.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: 'Comprovante ilegível',
        }),
      });
      const body = (await response.json()) as {
        status: string;
        rejection_reason: string;
      };

      expect(response.status).toBe(200);
      expect(body.status).toBe('rejected');
      expect(body.rejection_reason).toBe('Comprovante ilegível');
    });

    test('Returns 409 when submission is already reviewed', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Already Reviewed',
        email: `sub.patch.already.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const houses = await orchestrator.database.seed.getHouses();
      const member = await orchestrator.database.seed.createUser({
        username: 'Member Already Reviewed',
        email: `sub.patch.already.member.${Date.now()}@watt-test.com`,
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
        `already-${Date.now()}.txt`,
      );
      const sub = await orchestrator.database.seed.createSubmission({
        task_id: task.id,
        user_id: member.id,
        house_id: houses[0].id,
        cycle_id: cycle.id,
        file_path: fp,
      });

      await fetch(`${BASE_URL}/${sub.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      const response = await fetch(`${BASE_URL}/${sub.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      expect(response.status).toBe(409);
    });

    test('Returns 404 for non-existent submission', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Review 404',
        email: `sub.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assessor.token}`,
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Review Forbidden',
        email: `sub.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${consultor.token}`,
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/review`,
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
