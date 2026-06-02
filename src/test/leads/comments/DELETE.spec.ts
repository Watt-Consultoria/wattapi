import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── DELETE /leads/:id/comments/:comment_id ───────────────────────────────────

describe('DELETE /leads/:id/comments/:comment_id', () => {
  describe('Authenticated CONSULTOR do comercial (creator)', () => {
    test('Creator deleting own comment returns 204', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Delete Creator',
        email: `comments.delete.creator.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });
      const comment = await orchestrator.database.seed.createLeadComment({
        lead_id: lead.id,
        user_id: user.id,
        content: 'Comentário para deletar.',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      expect(response.status).toBe(204);
    });

    test('User with same rank who is not the creator attempting to delete returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Comment Delete Same Rank',
        email: `comments.delete.owner.samerank.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const comment = await orchestrator.database.seed.createLeadComment({
        lead_id: lead.id,
        user_id: owner.id,
        content: 'Comentário do dono.',
      });
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Delete Same Rank Actor',
        email: `comments.delete.samerank.actor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${actor.token}` },
        },
      );
      expect(response.status).toBe(403);
    });

    test('Attempting to delete a non-existent comment returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Delete 404',
        email: `comments.delete.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${NOT_FOUND_ID}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR do comercial (superior rank)', () => {
    test("Superior rank deleting a subordinate's comment returns 204", async () => {
      const subordinate = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Delete Subordinate',
        email: `comments.delete.subordinate.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: subordinate.id,
      });
      const comment = await orchestrator.database.seed.createLeadComment({
        lead_id: lead.id,
        user_id: subordinate.id,
        content: 'Comentário do subordinado.',
      });
      const superior = await orchestrator.database.seed.createUser({
        username: 'Diretor Comment Delete Superior',
        email: `comments.delete.superior.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${superior.token}` },
        },
      );
      expect(response.status).toBe(204);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden by RBA)', () => {
    test('Attempting to delete a comment returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Comment Delete RBA',
        email: `comments.delete.owner.rba.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const comment = await orchestrator.database.seed.createLeadComment({
        lead_id: lead.id,
        user_id: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Comment Delete',
        email: `comments.delete.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${forbidden.token}` },
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a comment without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_ID}/comments/${NOT_FOUND_ID}`,
        { method: 'DELETE' },
      );
      expect(response.status).toBe(401);
    });
  });
});
