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

describe('GET /settings', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving settings', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Settings',
        email: `settings.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as SettingsBody;

      expect(response.status).toBe(200);
      expect(typeof body.min_week_hours).toBe('number');
      expect(typeof body.min_availability_hours).toBe('number');
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving settings', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Settings',
        email: `settings.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving settings', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor GET Settings',
        email: `settings.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving settings', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Settings',
        email: `settings.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving settings', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Settings',
        email: `settings.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve settings without token returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
