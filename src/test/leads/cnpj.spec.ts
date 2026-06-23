import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/leads/cnpj';

type CnpjCacheData = Record<string, unknown>;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /leads/cnpj/:cnpj ────────────────────────────────────────────────────

describe('GET /leads/cnpj/:cnpj', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Returns 200 with cached data on cache hit', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Cnpj Hit',
        email: `leads.cnpj.hit.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const cachedData = {
        cnpj: '12345678000195',
        nome: 'EMPRESA TESTE LTDA',
        situacao: 'ATIVA',
      };
      await orchestrator.database.seed.createCnpjCacheEntry({
        cnpj: '12.345.678/0001-95',
        data: cachedData,
      });

      const response = await fetch(`${BASE_URL}/12345678000195`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as CnpjCacheData;

      expect(response.status).toBe(200);
      expect(body['nome']).toBe('EMPRESA TESTE LTDA');
      expect(body['situacao']).toBe('ATIVA');
    });

    test('CNPJ with invalid check digits returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Cnpj Bad Digits',
        email: `leads.cnpj.baddigits.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/11111111111111`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(400);
    });

    test('CNPJ with wrong digit count returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Cnpj Short',
        email: `leads.cnpj.short.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/1234567800019`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to lookup CNPJ returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Cnpj Lookup',
        email: `leads.cnpj.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/12345678000195`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to lookup CNPJ without token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/12345678000195`);
      expect(response.status).toBe(401);
    });
  });
});
