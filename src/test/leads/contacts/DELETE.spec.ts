import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /leads/:id/contacts/:contact_id ───────────────────────────────────

describe('DELETE /leads/:id/contacts/:contact_id', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Deleting a contact returns 204', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Delete',
        email: `contacts.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });
      const contact = await orchestrator.database.seed.createLeadContact({
        lead_id: lead.id,
        name: 'Contato Para Deletar',
        role: 'Diretor',
        email: 'contato@empresa.com',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${contact.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      expect(response.status).toBe(204);
    });

    test('Attempting to delete a non-existent contact returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Contact Delete 404',
        email: `contacts.delete.consultor.404.${Date.now()}@watt-test.com`,
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
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to delete a contact returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Contact Delete',
        email: `contacts.delete.owner.${Date.now()}@watt-test.com`,
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
        username: 'Gerente Projetos Contact Delete',
        email: `contacts.delete.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/contacts/${contact.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${forbidden.token}` },
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a contact without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_ID}/contacts/${NOT_FOUND_ID}`,
        { method: 'DELETE' },
      );
      expect(response.status).toBe(401);
    });
  });
});
