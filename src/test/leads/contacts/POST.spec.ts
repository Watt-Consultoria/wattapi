import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_LEAD_ID = '00000000-0000-0000-0000-000000000001';

type ContactBody = {
  id: string;
  lead_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /leads/:id/contacts ─────────────────────────────────────────────────

describe('POST /leads/:id/contacts', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Creating a contact with email returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Post',
        email: `contacts.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: 'João Silva',
          role: 'Diretor',
          email: 'joao@empresa.com',
        }),
      });
      const body = (await response.json()) as ContactBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.lead_id).toBe(lead.id);
      expect(body.name).toBe('João Silva');
      expect(body.email).toBe('joao@empresa.com');
    });

    test('Creating a contact with only phone returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Post Phone',
        email: `contacts.post.consultor.phone.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: 'Maria Santos',
          role: 'Gerente',
          phone: '11999999999',
        }),
      });
      expect(response.status).toBe(201);
    });

    test('Attempting to create a contact without email or phone returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Post Bad',
        email: `contacts.post.consultor.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ name: 'Sem Contato', role: 'Diretor' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a contact for a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Post 404',
        email: `contacts.post.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_LEAD_ID}/contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            name: 'Contato',
            role: 'Gestor',
            email: 'x@y.com',
          }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to add a contact returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Contact Post',
        email: `contacts.post.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Contact Post',
        email: `contacts.post.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${forbidden.token}`,
        },
        body: JSON.stringify({
          name: 'Contato',
          role: 'Gestor',
          email: 'x@y.com',
        }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to add a contact without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_LEAD_ID}/contacts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'X', role: 'Y', email: 'x@y.com' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
