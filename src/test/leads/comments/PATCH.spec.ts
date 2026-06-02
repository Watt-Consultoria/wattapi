import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_ID = '00000000-0000-0000-0000-000000000001';

type CommentBody = {
  id: string;
  content: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /leads/:id/comments/:comment_id ────────────────────────────────────

describe('PATCH /leads/:id/comments/:comment_id', () => {
  describe('Authenticated CONSULTOR do comercial (creator)', () => {
    test('Creator editing own comment returns 200 with updated_at', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Patch Creator',
        email: `comments.patch.creator.${Date.now()}@watt-test.com`,
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
        content: 'Conteúdo original.',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ content: 'Conteúdo corrigido.' }),
        },
      );
      const body = (await response.json()) as CommentBody;

      expect(response.status).toBe(200);
      expect(body.content).toBe('Conteúdo corrigido.');
      expect(body.updated_at).toBeDefined();
    });

    test('Non-creator attempting to edit a comment returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Comment',
        email: `comments.patch.owner.${Date.now()}@watt-test.com`,
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
        username: 'Consultor Comment Patch NonOwner',
        email: `comments.patch.nonowner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${actor.token}`,
          },
          body: JSON.stringify({ content: 'Tentativa de edição.' }),
        },
      );
      expect(response.status).toBe(403);
    });

    test('Attempting to update a non-existent comment returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Patch 404',
        email: `comments.patch.consultor.404.${Date.now()}@watt-test.com`,
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
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ content: 'Comentário inexistente.' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden by RBA)', () => {
    test('Attempting to edit a comment returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Comment Patch RBA',
        email: `comments.patch.owner.rba.${Date.now()}@watt-test.com`,
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
        username: 'Gerente Projetos Comment Patch',
        email: `comments.patch.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${LEADS_URL}/${lead.id}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${forbidden.token}`,
          },
          body: JSON.stringify({ content: 'Tentativa.' }),
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to edit a comment without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_ID}/comments/${NOT_FOUND_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Sem token.' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
