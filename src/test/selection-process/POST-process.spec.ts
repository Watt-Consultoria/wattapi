import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/selection-process';

const validPayload = {
  title: 'Processo Seletivo 2026.1',
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-02-01T00:00:00Z',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /selection-process ──────────────────────────────────────────────────

describe('POST /selection-process', () => {
  describe('Authenticated ASSESSOR', () => {
    test('Creating a selection process', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Process',
        email: `ps.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPayload),
      });
      const body = (await response.json()) as {
        id: string;
        title: string;
        starts_at: string;
        ends_at: string;
        created_at: string;
      };

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Processo Seletivo 2026.1');
      expect(body.starts_at).toBeDefined();
      expect(body.ends_at).toBeDefined();
    });

    test('Attempting to create a process with ends_at before starts_at', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Process Bad Dates',
        email: `ps.post.assessor.baddates.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'PS Inválido',
          starts_at: '2026-02-01T00:00:00Z',
          ends_at: '2026-01-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to create a process overlapping an existing one', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Process Overlap',
        email: `ps.post.assessor.overlap.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'PS Existente',
          starts_at: '2027-01-01T00:00:00Z',
          ends_at: '2027-02-28T00:00:00Z',
        }),
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'PS Sobreposto',
          starts_at: '2027-01-15T00:00:00Z',
          ends_at: '2027-03-15T00:00:00Z',
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a selection process', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Process',
        email: `ps.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'PS Presidente',
          starts_at: '2028-01-01T00:00:00Z',
          ends_at: '2028-02-01T00:00:00Z',
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a selection process without permission', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Process Forbidden',
        email: `ps.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to create a selection process without permission', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Process Forbidden',
        email: `ps.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to create a selection process without permission', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor POST Process Forbidden',
        email: `ps.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a selection process without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
    });
  });
});
