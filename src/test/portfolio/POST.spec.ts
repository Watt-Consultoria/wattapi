import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/portfolio';

type PortfolioItemBody = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

const validPayload = {
  name: 'Auditoria Elétrica',
  description: 'Verificação de instalações elétricas',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /portfolio ──────────────────────────────────────────────────────────

describe('POST /portfolio', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Portfolio Post',
        email: `portfolio.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to create a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Portfolio Post',
        email: `portfolio.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Creating a portfolio item returns 201 with the item', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Post',
        email: `portfolio.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const uniqueName = `Serviço Diretor ${Date.now()}`;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: uniqueName, description: 'Descrição' }),
      });
      const body = (await response.json()) as PortfolioItemBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.name).toBe(uniqueName);
      expect(body.created_at).toBeDefined();
    });

    test('Attempting to create with a duplicate name returns 409', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Duplicate',
        email: `portfolio.post.diretor.dup.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const duplicateName = `Serviço Duplicado ${Date.now()}`;
      await orchestrator.database.seed.createPortfolioItem({
        name: duplicateName,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: duplicateName }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a portfolio item returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Portfolio Post',
        email: `portfolio.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const uniqueName = `Serviço Assessor ${Date.now()}`;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: uniqueName }),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a portfolio item returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Portfolio Post',
        email: `portfolio.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const uniqueName = `Serviço Presidente ${Date.now()}`;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: uniqueName }),
      });
      expect(response.status).toBe(201);
    });

    test('Attempting to create without name returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Portfolio Post Bad',
        email: `portfolio.post.presidente.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'sem nome' }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a portfolio item without a token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(401);
    });
  });
});
