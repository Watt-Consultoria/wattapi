import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /selection-process ───────────────────────────────────────────────────

describe('GET /selection-process', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all selection processes', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Process Setup',
        email: `ps.get.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${admin.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'PS 2026.1',
          starts_at: '2026-03-01T00:00:00Z',
          ends_at: '2026-04-01T00:00:00Z',
        }),
      });

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Process',
        email: `ps.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as Array<{
        id: string;
        title: string;
      }>;

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    test('Listing processes returns empty array when none exist', async () => {
      await orchestrator.database.clear();

      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Process Empty',
        email: `ps.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as unknown[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list selection processes without a token', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
