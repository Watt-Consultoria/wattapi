import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

type LeadBody = {
  id: string;
  company_name: string;
  status: string;
  interest_items: string[];
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /leads/:id ─────────────────────────────────────────────────────────

describe('PATCH /leads/:id', () => {
  describe('Authenticated CONSULTOR COMERCIAL', () => {
    test('Updating lead status returns 200 with updated lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Patch',
        email: `leads.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Patch Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: 'em_progresso' }),
      });
      const body = (await response.json()) as LeadBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.status).toBe('em_progresso');
    });

    test('Updating interest_items replaces the entire array', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Patch Interest',
        email: `leads.patch.consultor.interest.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const serviceName = `Serviço Patch ${Date.now()}`;
      await orchestrator.database.seed.createPortfolioItem({
        name: serviceName,
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        interest_items: [],
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ interest_items: [serviceName] }),
      });
      const body = (await response.json()) as LeadBody;

      expect(response.status).toBe(200);
      expect(body.interest_items).toEqual([serviceName]);
    });

    test('Attempting to update with an invalid status returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Patch Bad Status',
        email: `leads.patch.consultor.badstatus.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: 'status_invalido' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update with invalid interest_items returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Patch Bad Interest',
        email: `leads.patch.consultor.badinterest.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ interest_items: ['Serviço Que Não Existe'] }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Patch 404',
        email: `leads.patch.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ status: 'contatado' }),
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PROJETOS', () => {
    test('Attempting to update a lead returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Patch',
        email: `leads.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Leads Patch',
        email: `leads.patch.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${forbidden.token}`,
        },
        body: JSON.stringify({ status: 'contatado' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a lead without a token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'contatado' }),
      });
      expect(response.status).toBe(401);
    });
  });
});
