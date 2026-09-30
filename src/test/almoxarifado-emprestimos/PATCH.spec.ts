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

// ─── PATCH /almoxarifado/emprestimos/:id ───────────────────────────────────

describe('PATCH /almoxarifado/emprestimos/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returning a loan increments material stock and keeps the record visible', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Return Emprestimo',
        email: `almoxarifado.emprestimos.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          quantidade_estoque: 7,
        });
      const loan =
        await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
          material_id: material.id,
          user_id: actor.id,
          quantidade: 3,
          previsao_devolucao: futureDate(7),
        });

      const response = await fetch(`${BASE_URL}/${loan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ observacoes: 'Devolvido em bom estado' }),
      });
      const body = (await response.json()) as AlmoxarifadoEmprestimoResponse;

      expect(response.status).toBe(200);
      expect(body.devolvido_em).not.toBeNull();
      expect(body.observacoes).toBe('Devolvido em bom estado');

      const materialResponse = await fetch(
        `http://localhost:3001/almoxarifado/material`,
        { headers: { Authorization: `Bearer ${actor.token}` } },
      );
      const materials =
        (await materialResponse.json()) as AlmoxarifadoMaterialResponse[];
      const updated = materials.find((m) => m.id === material.id);
      expect(updated?.quantidade_estoque).toBe(10);

      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      const loans =
        (await listResponse.json()) as AlmoxarifadoEmprestimoResponse[];
      expect(loans.some((e) => e.id === loan.id)).toBe(true);
    });

    test('Attempting to return an already returned loan', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Return Emprestimo Already Returned',
        email: `almoxarifado.emprestimos.patch.consultor.already.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();
      const loan =
        await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
          material_id: material.id,
          user_id: actor.id,
          devolvido_em: new Date().toISOString(),
        });

      const response = await fetch(`${BASE_URL}/${loan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to return a non-existent loan', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Return Emprestimo 404',
        email: `almoxarifado.emprestimos.patch.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${actor.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to return a loan without a token', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
