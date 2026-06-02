import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/portfolio';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

type PortfolioItemBody = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /portfolio/:id ─────────────────────────────────────────────────────

describe('PATCH /portfolio/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Portfolio Patch',
        email: `portfolio.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Consultor ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'nova descrição' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to update a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Portfolio Patch',
        email: `portfolio.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Gerente ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'nova descrição' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Partially updating a portfolio item returns 200 with updated item', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Patch',
        email: `portfolio.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Para Atualizar ${Date.now()}`,
        description: 'descrição original',
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'nova descrição' }),
      });
      const body = (await response.json()) as PortfolioItemBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(item.id);
      expect(body.description).toBe('nova descrição');
    });

    test('Attempting to update with empty body returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Patch Empty',
        email: `portfolio.patch.diretor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Empty Update ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent item returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Patch 404',
        email: `portfolio.patch.diretor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'nova descrição' }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Updating a portfolio item returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Portfolio Patch',
        email: `portfolio.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Assessor ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ description: 'atualizado por assessor' }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating a portfolio item returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Portfolio Patch',
        email: `portfolio.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Presidente ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: `Item Presidente Atualizado ${Date.now()}`,
        }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a portfolio item without a token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'teste' }),
      });
      expect(response.status).toBe(401);
    });
  });
});
