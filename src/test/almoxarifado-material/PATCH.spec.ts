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

// ─── PATCH /almoxarifado/material/:id ──────────────────────────────────────

describe('PATCH /almoxarifado/material/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update a material as consultor', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Update Material',
        email: `almoxarifado.material.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ quantidade_estoque: 20 }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Updating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Update Material',
        email: `almoxarifado.material.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Nome Original',
          quantidade_estoque: 3,
        });

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          nome: 'Nome Atualizado',
          quantidade_estoque: 8,
        }),
      });
      const body = (await response.json()) as AlmoxarifadoMaterialResponse;

      expect(response.status).toBe(200);
      expect(body.nome).toBe('Nome Atualizado');
      expect(body.quantidade_estoque).toBe(8);
    });

    test('Attempting to update a material with an empty body', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Update Material Empty Body',
        email: `almoxarifado.material.patch.gerente.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a material with negative quantidade_estoque', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Update Material Negative Stock',
        email: `almoxarifado.material.patch.gerente.negative.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ quantidade_estoque: -5 }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Update Material 404',
        email: `almoxarifado.material.patch.gerente.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${actor.token}`,
          },
          body: JSON.stringify({ quantidade_estoque: 10 }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating a material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente Update Material',
        email: `almoxarifado.material.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ observacoes: 'Revisado' }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a material without a token', async () => {
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(`${BASE_URL}/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade_estoque: 1 }),
      });
      expect(response.status).toBe(401);
    });
  });
});
