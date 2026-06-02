import orchestrator from '../../orchestrator';

const LEADS_URL = 'http://localhost:3001/leads';
const NOT_FOUND_LEAD_ID = '00000000-0000-0000-0000-000000000001';

type CommentBody = {
  id: string;
  lead_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /leads/:id/comments ─────────────────────────────────────────────────

describe('POST /leads/:id/comments', () => {
  describe('Authenticated CONSULTOR do comercial', () => {
    test('Creating a comment returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Post',
        email: `comments.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: 'Cliente demonstrou interesse.' }),
      });
      const body = (await response.json()) as CommentBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.lead_id).toBe(lead.id);
      expect(body.user_id).toBe(user.id);
      expect(body.content).toBe('Cliente demonstrou interesse.');
      expect(body.created_at).toBeDefined();
    });

    test('Attempting to create a comment with empty content returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Post Empty',
        email: `comments.post.consultor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ content: '' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a comment for a non-existent lead returns 404', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Comment Post 404',
        email: `comments.post.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_LEAD_ID}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ content: 'Comentário sem lead.' }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE de projetos (forbidden)', () => {
    test('Attempting to create a comment returns 403', async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Owner Lead Comment Post',
        email: `comments.post.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: owner.id,
      });
      const forbidden = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos Comment Post',
        email: `comments.post.gerente.projetos.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${LEADS_URL}/${lead.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${forbidden.token}`,
        },
        body: JSON.stringify({ content: 'Acesso indevido.' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a comment without a token returns 401', async () => {
      const response = await fetch(
        `${LEADS_URL}/${NOT_FOUND_LEAD_ID}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Sem token.' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
