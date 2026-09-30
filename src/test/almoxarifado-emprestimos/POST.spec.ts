import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/almoxarifado/emprestimos';

interface AlmoxarifadoEmprestimoResponse {
  id: string;
  material_id: string;
  quantidade: number;
  user_id: string;
  emprestado_em: string;
  previsao_devolucao: string;
  devolvido_em: string | null;
  observacoes: string | null;
}

interface AlmoxarifadoMaterialResponse {
  id: string;
  quantidade_estoque: number;
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /almoxarifado/emprestimos ────────────────────────────────────────

describe('POST /almoxarifado/emprestimos', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Creating a loan decrements material stock and associates the caller', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Emprestimo',
        email: `almoxarifado.emprestimos.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          quantidade_estoque: 10,
        });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          material_id: material.id,
          quantidade: 3,
          previsao_devolucao: futureDate(7),
        }),
      });
      const body = (await response.json()) as AlmoxarifadoEmprestimoResponse;

      expect(response.status).toBe(201);
      expect(body.material_id).toBe(material.id);
      expect(body.user_id).toBe(actor.id);
      expect(body.quantidade).toBe(3);
      expect(body.devolvido_em).toBeNull();

      const materialResponse = await fetch(
        `http://localhost:3001/almoxarifado/material`,
        { headers: { Authorization: `Bearer ${actor.token}` } },
      );
      const materials =
        (await materialResponse.json()) as AlmoxarifadoMaterialResponse[];
      const updated = materials.find((m) => m.id === material.id);
      expect(updated?.quantidade_estoque).toBe(7);
    });

    test('Attempting to create a loan with insufficient stock', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Emprestimo Insufficient',
        email: `almoxarifado.emprestimos.post.consultor.insufficient.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          quantidade_estoque: 2,
        });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          material_id: material.id,
          quantidade: 5,
          previsao_devolucao: futureDate(7),
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a loan with a missing required field', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Emprestimo Missing Field',
        email: `almoxarifado.emprestimos.post.consultor.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ material_id: material.id }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a loan with quantidade <= 0', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Emprestimo Invalid Quantity',
        email: `almoxarifado.emprestimos.post.consultor.invalidqty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          material_id: material.id,
          quantidade: 0,
          previsao_devolucao: futureDate(7),
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a loan for a non-existent material', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Emprestimo 404',
        email: `almoxarifado.emprestimos.post.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          material_id: '00000000-0000-0000-0000-000000000001',
          quantidade: 1,
          previsao_devolucao: futureDate(7),
        }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a loan without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: '00000000-0000-0000-0000-000000000001',
          quantidade: 1,
          previsao_devolucao: futureDate(7),
        }),
      });
      expect(response.status).toBe(401);
    });
  });
});
