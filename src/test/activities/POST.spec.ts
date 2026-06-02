import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/activities';

const validActivity = {
  name: 'Reunião de alinhamento',
  description: 'Alinhamento semanal',
  date: '2026-06-01',
  time_start: '09:00',
  time_end: '10:00',
  priority: 'alta',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /activities', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Creating a valid activity', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Activity',
        email: `activities.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify(validActivity),
      });
      const body = (await response.json()) as { id: string; user_id: string };

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(consultor.id);
      expect(typeof body.id).toBe('string');
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Creating a valid activity', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Activity',
        email: `activities.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify(validActivity),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Creating a valid activity', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor POST Activity',
        email: `activities.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify(validActivity),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a valid activity', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Activity',
        email: `activities.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify(validActivity),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a valid activity', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Activity',
        email: `activities.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify(validActivity),
      });

      expect(response.status).toBe(201);
    });

    test('Missing required field returns 400', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Missing',
        email: `activities.post.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ name: 'Apenas nome' }),
      });
      expect(response.status).toBe(400);
    });

    test('time_end before time_start returns 400', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Bad Time',
        email: `activities.post.badtime.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({
          ...validActivity,
          time_start: '10:00',
          time_end: '09:00',
        }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create an activity without token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validActivity),
      });
      expect(response.status).toBe(401);
    });
  });
});
