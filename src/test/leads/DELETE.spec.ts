import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /leads/:id ────────────────────────────────────────────────────────

describe('DELETE /leads/:id', () => {
  describe('Authenticated CONSULTOR do comercial (creator)', () => {
    test('Creator deleting own lead returns 204', async () => {
      const creator = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Delete Creator',
        email: `leads.delete.consultor.creator.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: creator.id,
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${creator.token}` },
      });
      expect(response.status).toBe(204);
    });

    test('Authorized non-creator with rank < 3 attempting to delete returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Delete',
        email: `leads.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Delete NonOwner',
        email: `leads.delete.consultor.nonowner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to delete a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Leads Delete 404',
        email: `leads.delete.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden by RBA)', () => {
    test('Attempting to delete a lead returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Delete RBA',
        email: `leads.delete.owner.rba.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Leads Delete',
        email: `leads.delete.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${forbidden.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR (superuser — can delete any lead)', () => {
    test("Superuser deleting another user's lead returns 204", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Delete Superuser',
        email: `leads.delete.owner.super.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const superuser = await orchestrator.database.seed.createUser({
        username: 'Assessor Leads Delete',
        email: `leads.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(`${BASE_URL}/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superuser.token}` },
      });
      expect(response.status).toBe(204);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a lead without a token returns 401', async () => {
      const response = await fetch(`${BASE_URL}/${NOT_FOUND_ID}`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(401);
    });
  });
});
