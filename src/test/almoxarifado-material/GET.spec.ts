import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/almoxarifado/material';

interface AlmoxarifadoMaterialResponse {
  id: string;
  nome: string;
  descricao: string;
  quantidade_estoque: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /almoxarifado/material ────────────────────────────────────────────

describe('GET /almoxarifado/material', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all materials', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor List Material',
        email: `almoxarifado.material.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Furadeira',
          descricao: 'Furadeira de impacto',
        });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AlmoxarifadoMaterialResponse[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((m) => m.id === material.id)).toBe(true);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Listing all materials', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente List Material',
        email: `almoxarifado.material.get.gerente.${Date.now()}@watt-test.com`,
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

  describe('Authenticated PRESIDENTE', () => {
    test('Listing all materials', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente List Material',
        email: `almoxarifado.material.get.presidente.${Date.now()}@watt-test.com`,
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
    test('Attempting to list materials without a token', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
