import orchestrator from '../orchestrator';

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

describe('PATCH /reimbursements/:id/status', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Trying to update reimbursement status', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Status',
        email: `reimbstatus.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: consultor.id,
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to update reimbursement status', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente PATCH Status',
        email: `reimbstatus.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: gerente.id,
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${gerente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to update reimbursement status', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor PATCH Status',
        email: `reimbstatus.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: diretor.id,
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${diretor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Approving a pending reimbursement', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH Status',
        email: `reimbstatus.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Reimb',
        email: `reimbstatus.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: owner.id,
          title: 'Para aprovar',
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(reimbursement.id);
      expect(body.status).toBe('approved');
    });

    test('Rejecting a pending reimbursement', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH Reject',
        email: `reimbstatus.reject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Reject',
        email: `reimbstatus.reject.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: owner.id,
          title: 'Para rejeitar',
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(200);
      expect(body.status).toBe('rejected');
    });

    test('Trying to update status of already resolved reimbursement', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Already Resolved',
        email: `reimbstatus.alreadyres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Already Resolved',
        email: `reimbstatus.alreadyres.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: owner.id,
          title: 'Já resolvido',
        });

      await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });

      expect(response.status).toBe(400);
    });

    test('Trying to update status of non-existent reimbursement', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente 404',
        email: `reimbstatus.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${presidente.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      expect(response.status).toBe(404);
    });

    test('Trying to update status with invalid value', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Bad Body',
        email: `reimbstatus.badbody.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Bad Body',
        email: `reimbstatus.badbody.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: owner.id,
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'pending' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Trying to update reimbursement status', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH Status',
        email: `reimbstatus.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Assessor',
        email: `reimbstatus.assessor.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const reimbursement =
        await orchestrator.database.seed.createReimbursement({
          user_id: owner.id,
        });

      const response = await fetch(`${BASE_URL}/${reimbursement.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to update reimbursement status', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
