import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/portfolio';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /portfolio/:id ────────────────────────────────────────────────────

describe('DELETE /portfolio/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to delete a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Portfolio Delete',
        email: `portfolio.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Delete Consultor ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to delete a portfolio item returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Portfolio Delete',
        email: `portfolio.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Delete Gerente ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Deleting a portfolio item returns 204', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Delete',
        email: `portfolio.delete.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Delete Diretor ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(204);
    });

    test('Attempting to delete a non-existent item returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Portfolio Delete 404',
        email: `portfolio.delete.diretor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Deleting a portfolio item returns 204', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Portfolio Delete',
        email: `portfolio.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Delete Assessor ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(204);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Deleting a portfolio item returns 204', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Portfolio Delete',
        email: `portfolio.delete.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const item = await orchestrator.database.seed.createPortfolioItem({
        name: `Item Delete Presidente ${Date.now()}`,
      });

      const response = await fetch(`${BASE_URL}/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(204);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a portfolio item without a token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(401);
    });
  });
});
