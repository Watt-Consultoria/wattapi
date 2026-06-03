import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/norms';

type NormResponse = {
  id: string;
  code: string;
  description: string;
  severity: 'leve' | 'moderada' | 'grave' | 'desligamento';
  created_at: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /norms ───────────────────────────────────────────────────────────────

describe('GET /norms', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving norms', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor List Norms',
        email: `norms.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const norm = await orchestrator.database.seed.createNorm({
        code: `TST${Date.now()}`,
        description: 'Norma de teste consultor',
        severity: 'leve',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as NormResponse[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((n) => n.id === norm.id);
      expect(found).toBeDefined();
      expect(found?.code).toBe(norm.code);
      expect(found?.severity).toBe('leve');
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving norms', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente List Norms',
        email: `norms.get.gerente.${Date.now()}@watt-test.com`,
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
    test('Retrieving norms', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor List Norms',
        email: `norms.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving norms', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor List Norms',
        email: `norms.get.assessor.${Date.now()}@watt-test.com`,
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
    test('Retrieving norms', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente List Norms',
        email: `norms.get.presidente.${Date.now()}@watt-test.com`,
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
    test('Attempting to list norms without a token', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
