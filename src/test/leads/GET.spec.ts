import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

type LeadDetailBody = {
  id: string;
  company_name: string;
  status: string;
  created_by: string;
  created_at: string;
  interest_items: string[];
  contacts: unknown[];
  comments: unknown[];
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /leads ───────────────────────────────────────────────────────────────

describe('GET /leads', () => {
  describe('Authenticated CONSULTOR COMERCIAL', () => {
    test('Listing leads returns contacts and comments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Get',
        email: `leads.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      await orchestrator.database.seed.createLead({ created_by: user.id });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(typeof body[0].id).toBe('string');
      expect(typeof body[0].company_name).toBe('string');
      expect(typeof body[0].status).toBe('string');
      expect(typeof body[0].created_by).toBe('string');
      expect(Array.isArray(body[0].contacts)).toBe(true);
      expect(Array.isArray(body[0].comments)).toBe(true);
    });
  });

  describe('Authenticated GERENTE COMERCIAL', () => {
    test('Listing leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Comercial Leads Get',
        email: `leads.get.gerente.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated GERENTE PROJETOS', () => {
    test('Attempting to list leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Leads Get',
        email: `leads.get.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR MARKETING', () => {
    test('Listing leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Marketing Leads Get',
        email: `leads.get.diretor.marketing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'marketing',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR COMERCIAL', () => {
    test('Listing leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Comercial Leads Get',
        email: `leads.get.diretor.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR PROJETOS', () => {
    test('Attempting to list leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Projetos Leads Get',
        email: `leads.get.diretor.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Listing leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Leads Get',
        email: `leads.get.assessor.${Date.now()}@watt-test.com`,
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
    test('Listing leads', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Leads Get',
        email: `leads.get.presidente.${Date.now()}@watt-test.com`,
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
    test('Attempting to list leads without a token returns 401', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});

// ─── GET /leads/:id ───────────────────────────────────────────────────────────

describe('GET /leads/:id', () => {
  describe('Authenticated CONSULTOR COMERCIAL', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Get By Id',
        email: `leads.getid.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Get 404',
        email: `leads.getid.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE COMERCIAL', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Comercial Leads Get By Id',
        email: `leads.getid.gerente.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Comercial Leads Get 404',
        email: `leads.getid.gerente.comercial.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR MARKETING', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Marketing Leads Get By Id',
        email: `leads.getid.diretor.marketing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'marketing',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Marketing Leads Get 404',
        email: `leads.getid.diretor.marketing.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'marketing',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR COMERCIAL', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Comercial Leads Get By Id',
        email: `leads.getid.diretor.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Comercial Leads Get 404',
        email: `leads.getid.diretor.comercial.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Executivo Leads Get By Id',
        email: `leads.getid.assessor.executivo.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Executivo Leads Get 404',
        email: `leads.getid.assessor.executivo.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving a lead', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Executivo Leads Get By Id',
        email: `leads.getid.presidente.executivo.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
        company_name: 'Empresa Detalhe Teste',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as LeadDetailBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(lead.id);
      expect(body.company_name).toBe('Empresa Detalhe Teste');
      expect(Array.isArray(body.contacts)).toBe(true);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(Array.isArray(body.interest_items)).toBe(true);
    });

    test('Attempting to retrieve a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Executivo Leads Get 404',
        email: `leads.getid.presidente.executivo.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE PROJETOS', () => {
    test('Attempting to retrieve a lead', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead',
        email: `leads.getid.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Leads GetId',
        email: `leads.getid.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        headers: { Authorization: `Bearer ${forbidden.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve a lead without a token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`);
      expect(response.status).toBe(401);
    });
  });
});
