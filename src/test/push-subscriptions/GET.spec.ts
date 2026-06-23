import orchestrator from '../orchestrator';

const VAPID_KEY_URL =
  'http://localhost:3001/push-subscriptions/vapid-public-key';

type VapidPublicKeyResponse = {
  vapid_public_key: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /push-subscriptions/vapid-public-key ─────────────────────────────────

describe('GET /push-subscriptions/vapid-public-key', () => {
  describe('Unauthenticated user', () => {
    test('Returns 200 with the VAPID public key without requiring authentication', async () => {
      const response = await fetch(VAPID_KEY_URL);
      const body = (await response.json()) as VapidPublicKeyResponse;

      expect(response.status).toBe(200);
      expect(typeof body.vapid_public_key).toBe('string');
      expect(body.vapid_public_key.length).toBeGreaterThan(0);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Returns 200 with the VAPID public key when authenticated', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Get VAPID Key',
        email: `push.get.vapid.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(VAPID_KEY_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as VapidPublicKeyResponse;

      expect(response.status).toBe(200);
      expect(typeof body.vapid_public_key).toBe('string');
      expect(body.vapid_public_key.length).toBeGreaterThan(0);
    });
  });
});
