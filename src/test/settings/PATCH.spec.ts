import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/settings';

type SettingsBody = {
  min_week_hours: number;
  min_availability_hours: number;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /settings', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Trying to update settings', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Settings',
        email: `settings.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to update settings', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PATCH Settings',
        email: `settings.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to update settings', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PATCH Settings',
        email: `settings.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Updating min_week_hours', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Settings',
        email: `settings.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      const body = (await response.json()) as SettingsBody;

      expect(response.status).toBe(200);
      expect(body.min_week_hours).toBe(35);

      await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 40 }),
      });
    });

    test('Updating min_availability_hours', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Avail Hours',
        email: `settings.patch.avail.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 10 }),
      });
      const body = (await response.json()) as SettingsBody;

      expect(response.status).toBe(200);
      expect(body.min_availability_hours).toBe(10);

      const response2 = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body2 = (await response2.json()) as SettingsBody;

      expect(body2.min_availability_hours).toBe(10);

      await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });

    test('With an invalid request body', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Invalid Body',
        email: `settings.patch.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const emptyBody = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({}),
      });

      const invalidValueType = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 'abc' }),
      });

      const invalidNegativeValue = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_week_hours: -9 }),
      });

      const minAvailabilityHoursAbove98 = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ min_week_hours: 789 }),
      });

      expect(emptyBody.status).toBe(400);
      expect(invalidValueType.status).toBe(400);
      expect(invalidNegativeValue.status).toBe(400);
      expect(minAvailabilityHoursAbove98.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating min_week_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PATCH Settings',
        email: `settings.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      const body = (await response.json()) as SettingsBody;

      expect(response.status).toBe(200);
      expect(body.min_week_hours).toBe(35);

      await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_week_hours: 40 }),
      });
    });

    test('Updating min_availability_hours', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PATCH Avail Hours',
        email: `settings.patch.avail.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 10 }),
      });
      const body = (await response.json()) as SettingsBody;

      expect(response.status).toBe(200);
      expect(body.min_availability_hours).toBe(10);

      const response2 = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body2 = (await response2.json()) as SettingsBody;

      expect(body2.min_availability_hours).toBe(10);

      await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_availability_hours: 0 }),
      });
    });

    test('With an invalid request body', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente PATCH Invalid Body',
        email: `settings.patch.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const emptyBody = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({}),
      });

      const invalidValueType = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_week_hours: 'abc' }),
      });

      const invalidNegativeValue = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_week_hours: -9 }),
      });

      const minAvailabilityHoursAbove98 = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ min_week_hours: 789 }),
      });

      expect(emptyBody.status).toBe(400);
      expect(invalidValueType.status).toBe(400);
      expect(invalidNegativeValue.status).toBe(400);
      expect(minAvailabilityHoursAbove98.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update settings without token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_week_hours: 35 }),
      });
      expect(response.status).toBe(401);
    });
  });
});
