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

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /almoxarifado/emprestimos ─────────────────────────────────────────

describe('GET /almoxarifado/emprestimos', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all loans, including returned ones', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor List Emprestimos',
        email: `almoxarifado.emprestimos.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const material =
        await orchestrator.database.seed.createAlmoxarifadoMaterial();
      const activeLoan =
        await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
          material_id: material.id,
          user_id: user.id,
        });
      const returnedLoan =
        await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
          material_id: material.id,
          user_id: user.id,
          devolvido_em: new Date().toISOString(),
        });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AlmoxarifadoEmprestimoResponse[];

      expect(response.status).toBe(200);
      expect(body.some((e) => e.id === activeLoan.id)).toBe(true);
      expect(body.some((e) => e.id === returnedLoan.id)).toBe(true);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Listing all loans', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente List Emprestimos',
        email: `almoxarifado.emprestimos.get.presidente.${Date.now()}@watt-test.com`,
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
    test('Attempting to list loans without a token', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
