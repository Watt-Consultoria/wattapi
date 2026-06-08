import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process';

async function createProcess(
  adminToken: string,
  overrides: { starts_at?: string; ends_at?: string; title?: string } = {},
): Promise<{ id: string }> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: overrides.title ?? 'PS Original',
      starts_at: overrides.starts_at ?? '2030-01-01T00:00:00Z',
      ends_at: overrides.ends_at ?? '2030-02-01T00:00:00Z',
    }),
  });
  return res.json() as Promise<{ id: string }>;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /selection-process/:processId ─────────────────────────────────────

describe('PATCH /selection-process/:processId', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Updating a process title', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process',
        email: `ps.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(user.token);

      const response = await fetch(`${BASE_URL}/${process.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'PS Atualizado' }),
      });
      const body = (await response.json()) as { id: string; title: string };

      expect(response.status).toBe(200);
      expect(body.title).toBe('PS Atualizado');
      expect(body.id).toBe(process.id);
    });

    test('Updating dates without overlap passes', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process Dates',
        email: `ps.patch.dates.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(user.token, {
        starts_at: '2031-01-01T00:00:00Z',
        ends_at: '2031-02-01T00:00:00Z',
      });

      const response = await fetch(`${BASE_URL}/${process.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starts_at: '2031-03-01T00:00:00Z',
          ends_at: '2031-04-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(200);
    });

    test('Attempting to update with ends_at before starts_at returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process Bad Dates',
        email: `ps.patch.baddates.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(user.token, {
        starts_at: '2032-01-01T00:00:00Z',
        ends_at: '2032-02-01T00:00:00Z',
      });

      const response = await fetch(`${BASE_URL}/${process.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starts_at: '2032-06-01T00:00:00Z',
          ends_at: '2032-01-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to update with overlapping range returns 409', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process Overlap',
        email: `ps.patch.overlap.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      await createProcess(user.token, {
        starts_at: '2033-01-01T00:00:00Z',
        ends_at: '2033-02-28T00:00:00Z',
      });
      const second = await createProcess(user.token, {
        starts_at: '2033-06-01T00:00:00Z',
        ends_at: '2033-07-01T00:00:00Z',
      });

      const response = await fetch(`${BASE_URL}/${second.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          starts_at: '2033-01-15T00:00:00Z',
          ends_at: '2033-03-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(409);
    });

    test('Attempting to update a non-existent process returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process 404',
        email: `ps.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'X' }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update a process without permission returns 403', async () => {
      const admin = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Process Forbidden Setup',
        email: `ps.patch.forbidden.setup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const process = await createProcess(admin.token, {
        starts_at: '2034-01-01T00:00:00Z',
        ends_at: '2034-02-01T00:00:00Z',
      });

      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Process Forbidden',
        email: `ps.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${process.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Hackeado' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a process without a token returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'X' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
