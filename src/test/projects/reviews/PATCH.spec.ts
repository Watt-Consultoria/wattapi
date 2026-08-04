import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type ProjectReviewBody = {
  id: string;
  project_id: string;
  round: number;
  approved: boolean;
  notes: string;
  reviewer_id: string;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço ProjectReviews PATCH ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProject(status = 'em_revisao') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente ProjectReviews PATCH ${Date.now()}`,
    email: `gerente.projectreviews.patch.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const lead = await orchestrator.database.seed.createLead({
    created_by: manager.id,
  });
  const portfolioItem = await orchestrator.database.seed.createPortfolioItem({
    name: nextPortfolioName(),
  });
  const project = await orchestrator.database.seed.createProject({
    lead_id: lead.id,
    project_type_id: portfolioItem.id,
    created_by: manager.id,
    status,
  });
  return { manager, project };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /projects/:id/reviews', () => {
  describe('Authenticated DIRETOR', () => {
    test('Approving a project', async () => {
      const { manager, project } = await createManagerWithProject();
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews PATCH Approve',
        email: `diretor.projectreviews.patch.approve.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true, notes: 'Projeto aprovado' }),
      });
      const body = (await response.json()) as ProjectReviewBody;

      expect(response.status).toBe(200);
      expect(body.approved).toBe(true);
      expect(body.round).toBe(1);
      expect(body.reviewer_id).toBe(director.id);

      const projectRes = await fetch(`${BASE_URL}/${project.id}`, {
        headers: { Authorization: `Bearer ${director.token}` },
      });
      const projectBody = (await projectRes.json()) as { status: string };
      expect(projectBody.status).toBe('revisado');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${manager.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Rejecting a project', async () => {
      const { manager, project } = await createManagerWithProject();
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews PATCH Reject',
        email: `diretor.projectreviews.patch.reject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: false,
          notes: 'Necessário revisar o escopo',
        }),
      });
      const body = (await response.json()) as ProjectReviewBody;

      expect(response.status).toBe(200);
      expect(body.approved).toBe(false);

      const projectRes = await fetch(`${BASE_URL}/${project.id}`, {
        headers: { Authorization: `Bearer ${director.token}` },
      });
      const projectBody = (await projectRes.json()) as { status: string };
      expect(projectBody.status).toBe('em_andamento');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${manager.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Missing notes', async () => {
      const { project } = await createManagerWithProject();
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews PATCH NoNotes',
        email: `diretor.projectreviews.patch.nonotes.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true }),
      });

      expect(response.status).toBe(400);
    });

    test('Project is not em_revisao', async () => {
      const { project } = await createManagerWithProject('em_andamento');
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews PATCH NotRevisao',
        email: `diretor.projectreviews.patch.notrevisao.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true, notes: 'Aprovado' }),
      });

      expect(response.status).toBe(409);
    });

    test('Unknown project', async () => {
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews PATCH Unknown',
        email: `diretor.projectreviews.patch.unknown.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/reviews`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${director.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true, notes: 'Aprovado' }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to review a project', async () => {
      const { manager, project } = await createManagerWithProject();

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true, notes: 'Aprovado' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to review a project', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/reviews`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true, notes: 'Aprovado' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
