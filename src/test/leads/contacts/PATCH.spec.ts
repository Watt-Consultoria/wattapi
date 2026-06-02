import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

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

// ─── PATCH /leads/:id/contacts/:contact_id ────────────────────────────────────

describe('PATCH /leads/:id/contacts/:contact_id', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Updating a contact name returns 200', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Patch',
        email: `contacts.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });
      const contact = await orchestrator.database.seed.createLeadContact({
        lead_id: lead.id,
        name: 'Nome Original',
        role: 'Diretor',
        email: 'original@empresa.com',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${contact.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ name: 'Nome Atualizado' }),
        },
      );
      const body = (await response.json()) as ContactBody;

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome Atualizado');
      expect(body.email).toBe('original@empresa.com');
    });

    test('Removing the only contact method returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Patch Remove Email',
        email: `contacts.patch.consultor.removeemail.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });
      const contact = await orchestrator.database.seed.createLeadContact({
        lead_id: lead.id,
        name: 'Contato Só Email',
        role: 'Gestor',
        email: 'soEmail@empresa.com',
        phone: null,
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${contact.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ email: null }),
        },
      );
      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent contact returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Patch 404',
        email: `contacts.patch.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${NOT_FOUND_ID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ name: 'Novo Nome' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to update a contact returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Contact Patch',
        email: `contacts.patch.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const contact = await orchestrator.database.seed.createLeadContact({
        lead_id: lead.id,
        name: 'Contato',
        role: 'Gestor',
        phone: '11999999999',
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Contact Patch',
        email: `contacts.patch.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${contact.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${forbidden.token}`,
          },
          body: JSON.stringify({ name: 'Novo Nome' }),
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a contact without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_ID}/contacts/${NOT_FOUND_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Teste' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
