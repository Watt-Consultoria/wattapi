import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/activities';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('DELETE /activities/:id', () => {
  describe('Authenticated CONSULTOR (activity owner)', () => {
    test('Deleting own activity returns 204', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE Activity',
        email: `activities.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(204);
    });

    test('Deleted activity returns 404 on follow-up delete', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE Verify',
        email: `activities.delete.verify.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: consultor.id,
      });

      await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Non-existent activity id returns 404', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE 404',
        email: `activities.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${consultor.token}` },
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE (non-owner)', () => {
    test("Trying to delete another user's activity returns 403", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Activity Owner DELETE',
        email: `activities.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente DELETE Forbidden',
        email: `activities.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const activity = await orchestrator.database.seed.createActivity({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${activity.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete an activity without token returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { method: 'DELETE' },
      );
      expect(response.status).toBe(401);
    });
  });
});
