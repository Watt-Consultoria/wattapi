import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type FeedbackBody = {
  id: string;
  project_id: string;
  consultor_id: string;
  answers: Record<string, unknown>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Feedback POST ${Date.now()}-${portfolioNameSeq++}`;
}

async function createFinalizedProjectWithConsultant(status = 'finalizado') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Feedback POST ${Date.now()}`,
    email: `gerente.feedback.post.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Feedback POST ${Date.now()}`,
    email: `consultor.feedback.post.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'consultor',
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
  await orchestrator.database.seed.createProjectStage({
    project_id: project.id,
    consultant_id: consultor.id,
    created_by: manager.id,
    status: 'concluida',
  });
  return { manager, consultor, project };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /projects/:id/feedback', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Successful feedback submission', async () => {
      const { consultor, project } =
        await createFinalizedProjectWithConsultant();

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: { satisfacao: 'boa', nota: 9 } }),
      });
      const body = (await response.json()) as FeedbackBody;

      expect(response.status).toBe(201);
      expect(body.project_id).toBe(project.id);
      expect(body.consultor_id).toBe(consultor.id);
      expect(body.answers).toEqual({ satisfacao: 'boa', nota: 9 });
    });

    test('Project is not finalizado', async () => {
      const { consultor, project } =
        await createFinalizedProjectWithConsultant('em_andamento');

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: { satisfacao: 'boa' } }),
      });

      expect(response.status).toBe(409);
    });

    test('Consultant was never assigned to the project', async () => {
      const { project } = await createFinalizedProjectWithConsultant();
      const otherConsultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Feedback POST NotAssigned',
        email: `consultor.feedback.post.notassigned.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${otherConsultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: { satisfacao: 'boa' } }),
      });

      expect(response.status).toBe(403);
    });

    test('Duplicate feedback submission', async () => {
      const { consultor, project } =
        await createFinalizedProjectWithConsultant();
      await orchestrator.database.seed.createProjectFeedback({
        project_id: project.id,
        consultor_id: consultor.id,
      });

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: { satisfacao: 'boa' } }),
      });

      expect(response.status).toBe(409);
    });

    test('Missing answers', async () => {
      const { consultor, project } =
        await createFinalizedProjectWithConsultant();

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    test('Unknown project', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Feedback POST Unknown',
        email: `consultor.feedback.post.unknown.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/feedback`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answers: { satisfacao: 'boa' } }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to submit feedback', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: { satisfacao: 'boa' } }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
