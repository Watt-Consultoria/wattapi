import orchestrator from '../orchestrator';
import type { CreatedReimbursement } from '../orchestrator';

const BASE_URL = 'http://localhost:3001/reimbursements';

type ReimbursementBody = {
  id: string;
  user_id: string;
  title: string;
  amount_cents: number;
  status: string;
  attachments: unknown[];
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /reimbursements', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own reimbursements', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Teste',
        email: 'consultor@watt-test.com',
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: consultor.id,
          title: 'Viagem SP',
          amount_cents: 15000,
        });

      const response = await fetch(`${BASE_URL}?target=me`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === consultor.id)).toBe(true);
      expect(body.some((r) => r.id === reimbursement.id)).toBe(true);
    });

    test('Trying to retrieve all reimbursements', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Teste',
        email: `reimb.get.all.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}?target=all`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving own reimbursements', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Teste',
        email: 'gerente@watt-test.com',
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: gerente.id,
          title: 'Equipamento escritório',
          amount_cents: 32000,
        });

      const response = await fetch(`${BASE_URL}?target=me`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === gerente.id)).toBe(true);
      expect(body.some((r) => r.id === reimbursement.id)).toBe(true);
    });

    test('Trying to retrieve all reimbursements', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Teste',
        email: `reimb.get.all.gerente.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}?target=all`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving own reimbursements', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor Teste',
        email: 'diretor@watt-test.com',
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: diretor.id,
          title: 'Alimentação cliente',
          amount_cents: 9800,
        });

      const response = await fetch(`${BASE_URL}?target=me`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === diretor.id)).toBe(true);
      expect(body.some((r) => r.id === reimbursement.id)).toBe(true);
    });

    test('Trying to retrieve all reimbursements', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Teste',
        email: `reimb.get.all.diretor.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}?target=all`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    let assessor: Awaited<
      ReturnType<typeof orchestrator.database.seed.createUser>
    >;
    let assessorReimbursement: CreatedReimbursement;

    beforeAll(async () => {
      assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Teste',
        email: 'assessor@watt-test.com',
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      assessorReimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: assessor.id,
          title: 'Transporte reunião',
          amount_cents: 4500,
        });
    });

    test('Retrieving own reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=me`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === assessor.id)).toBe(true);
      expect(body.some((r) => r.id === assessorReimbursement.id)).toBe(true);
    });

    test('Retrieving all reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=all`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((r) => r.id === assessorReimbursement.id)).toBe(true);
      const userIds = new Set(body.map((r) => r.user_id));
      expect(userIds.size).toBeGreaterThan(1);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    let presidente: Awaited<
      ReturnType<typeof orchestrator.database.seed.createUser>
    >;
    let presidenteReimbursement: CreatedReimbursement;

    beforeAll(async () => {
      presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Teste',
        email: 'presidente@watt-test.com',
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      presidenteReimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: presidente.id,
          title: 'Ingresso evento',
          amount_cents: 75000,
        });
    });

    test('Retrieving own reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=me`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === presidente.id)).toBe(true);
      expect(body.some((r) => r.id === presidenteReimbursement.id)).toBe(true);
    });

    test('Retrieving all reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=all`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.some((r) => r.id === presidenteReimbursement.id)).toBe(true);
      const userIds = new Set(body.map((r) => r.user_id));
      expect(userIds.size).toBeGreaterThan(1);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to retrieve own reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=me`);
      expect(response.status).toBe(401);
    });

    test('Trying to retrieve all reimbursements', async () => {
      const response = await fetch(`${BASE_URL}?target=all`);
      expect(response.status).toBe(401);
    });
  });
});

describe('GET /reimbursements/:user_id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Returns 403', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET By User',
        email: `reimbbyuser.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Consultor',
        email: `reimbbyuser.cns.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Returns 403', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente GET By User',
        email: `reimbbyuser.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target gerente',
        email: `reimbbyuser.dir.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Returns 403', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor GET By User',
        email: `reimbbyuser.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Diretor',
        email: `reimbbyuser.dir.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    let assessor: Awaited<
      ReturnType<typeof orchestrator.database.seed.createUser>
    >;
    let target: Awaited<
      ReturnType<typeof orchestrator.database.seed.createUser>
    >;
    let targetReimbursement: CreatedReimbursement;

    beforeAll(async () => {
      assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET By User',
        email: `reimbbyuser.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      target = await orchestrator.database.seed.createUser({
        username: 'Target User',
        email: `reimbbyuser.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      targetReimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: target.id,
          title: 'Reembolso do target',
          amount_cents: 8000,
        });
    });

    test('Returns reimbursements for the given user', async () => {
      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.every((r) => r.user_id === target.id)).toBe(true);
      expect(body.some((r) => r.id === targetReimbursement.id)).toBe(true);
    });

    test('Returns empty array when user has no reimbursements', async () => {
      const emptyUser = await orchestrator.database.seed.createUser({
        username: 'Empty User',
        email: `reimbbyuser.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${emptyUser.id}`, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Returns reimbursements for the given user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET By User',
        email: `reimbbyuser.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Presidente',
        email: `reimbbyuser.pres.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: target.id,
        });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as ReimbursementBody[];

      expect(response.status).toBe(200);
      expect(body.some((r) => r.id === reimbursement.id)).toBe(true);
    });
  });

  describe('Unauthenticated user', () => {
    test('Returns 401', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(401);
    });
  });
});
