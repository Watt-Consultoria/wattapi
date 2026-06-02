import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/portfolio';

type PortfolioItemBody = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /portfolio ───────────────────────────────────────────────────────────

describe('GET /portfolio', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing portfolio items returns 200 with array', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Portfolio Get',
        email: `portfolio.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createPortfolioItem({
        name: `Consultoria Energética ${Date.now()}`,
        description: 'Análise de consumo energético',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as PortfolioItemBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(typeof body[0].id).toBe('string');
      expect(typeof body[0].name).toBe('string');
      expect(typeof body[0].created_at).toBe('string');
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Listing portfolio items returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Portfolio Get',
        email: `portfolio.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Listing portfolio items returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Get',
        email: `portfolio.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Listing portfolio items returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Portfolio Get',
        email: `portfolio.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Listing portfolio items returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Portfolio Get',
        email: `portfolio.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to list portfolio without a token returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
