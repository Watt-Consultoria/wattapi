import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/push-subscriptions';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /push-subscriptions/:id ──────────────────────────────────────────

describe('DELETE /push-subscriptions/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Owner removes own push subscription and gets 204', async () => {
      const ts = Date.now();
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Delete Push',
        email: `push.delete.consultor.owner.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const createResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          endpoint: `https://fcm.googleapis.com/fcm/send/del-owner-${ts}`,
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        }),
      });
      const { id } = (await createResponse.json()) as { id: string };

      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(204);
    });

    test('Non-owner attempting to remove another user subscription returns 403', async () => {
      const ts = Date.now();
      const owner = await orchestrator.database.seed.createUser({
        username: 'Consultor Push Owner',
        email: `push.delete.consultor.src.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Push Actor Forbidden',
        email: `push.delete.consultor.actor.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const createResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
          endpoint: `https://fcm.googleapis.com/fcm/send/del-forbidden-${ts}`,
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        }),
      });
      const { id } = (await createResponse.json()) as { id: string };

      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${actor.token}` },
      });

      expect(response.status).toBe(403);
    });

    test('Attempting to remove a non-existent subscription returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Delete Push 404',
        email: `push.delete.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      expect(response.status).toBe(404);
    });

    test('Attempting to remove an already soft-deleted subscription returns 404', async () => {
      const ts = Date.now();
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Delete Push Already Deleted',
        email: `push.delete.consultor.already-del.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const createResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          endpoint: `https://fcm.googleapis.com/fcm/send/del-twice-${ts}`,
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        }),
      });
      const { id } = (await createResponse.json()) as { id: string };

      await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const response = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to remove a push subscription without a token returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { method: 'DELETE' },
      );

      expect(response.status).toBe(401);
    });
  });
});
