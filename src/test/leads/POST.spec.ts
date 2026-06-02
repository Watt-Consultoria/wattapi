import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/leads';

type LeadBody = {
  id: string;
  company_name: string;
  cnpj: string;
  status: string;
  created_by: string;
  interest_items: string[];
};

const validPayload = {
  company_name: 'Empresa Teste',
  cnpj: '12.345.678/0001-95',
  address_logradouro: 'Rua das Flores',
  address_numero: '42',
  address_bairro: 'Jardim Paulista',
  address_cidade: 'São Paulo',
  address_estado: 'SP',
  address_cep: '01310100',
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /leads ──────────────────────────────────────────────────────────────

describe('POST /leads', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Creating a lead with minimal data returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post',
        email: `leads.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      const body = (await response.json()) as LeadBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.company_name).toBe('Empresa Teste');
      expect(body.status).toBe('nao_contatado');
      expect(body.created_by).toBe(user.id);
      expect(body.interest_items).toEqual([]);
    });

    test('Creating a lead with valid interest_items returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post Interest',
        email: `leads.post.consultor.interest.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const serviceName = `Serviço ${Date.now()}`;
      await orchestrator.database.seed.createPortfolioItem({
        name: serviceName,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          interest_items: [serviceName],
        }),
      });
      const body = (await response.json()) as LeadBody;

      expect(response.status).toBe(201);
      expect(body.interest_items).toEqual([serviceName]);
    });

    test('Attempting to create a lead with non-existent interest_items returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post Bad Interest',
        email: `leads.post.consultor.badinterest.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          interest_items: ['Serviço Inexistente'],
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Creating a lead with valid cnpj includes it in response', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post Cnpj',
        email: `leads.post.consultor.cnpj.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      const body = (await response.json()) as LeadBody;

      expect(response.status).toBe(201);
      expect(body.cnpj).toBe('12.345.678/0001-95');
    });

    test('Attempting to create a lead without cnpj returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post No Cnpj',
        email: `leads.post.consultor.nocnpj.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { cnpj: _omit, ...payloadWithoutCnpj } = validPayload;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payloadWithoutCnpj),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a lead with unformatted cnpj returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post Bad Cnpj Format',
        email: `leads.post.consultor.badcnpjfmt.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, cnpj: '12345678000195' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a lead with cnpj with invalid check digits returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post Invalid Cnpj Digits',
        email: `leads.post.consultor.invalidcnpjdigits.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, cnpj: '11.111.111/1111-11' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a lead without company_name returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post No Name',
        email: `leads.post.consultor.noname.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { company_name: _omit, ...payloadWithoutName } = validPayload;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payloadWithoutName),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a lead without required address field returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Post No Address',
        email: `leads.post.consultor.noaddr.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { address_cidade: _omit, ...payloadWithoutCity } = validPayload;

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payloadWithoutCity),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to create a lead returns 403', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Leads Post',
        email: `leads.post.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR (minRank)', () => {
    test('Creating a lead returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Leads Post',
        email: `leads.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a lead returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Leads Post',
        email: `leads.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(201);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a lead without a token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });
      expect(response.status).toBe(401);
    });
  });
});
