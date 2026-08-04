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
  return `Serviço Feedback GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createFinalizedProjectWithFeedback() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Feedback GET ${Date.now()}`,
    email: `gerente.feedback.get.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Feedback GET ${Date.now()}`,
    email: `consultor.feedback.get.${Date.now()}.${Math.random()}@watt-test.com`,
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
    status: 'finalizado',
  });
  const feedback = await orchestrator.database.seed.createProjectFeedback({
    project_id: project.id,
    consultor_id: consultor.id,
    answers: { satisfacao: 'boa' },
  });
  return { manager, consultor, project, feedback };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects/:id/feedback', () => {
  describe('Authenticated GERENTE', () => {
    test('Manager lists feedback', async () => {
      const { manager, project, feedback } =
        await createFinalizedProjectWithFeedback();

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        headers: { Authorization: `Bearer ${manager.token}` },
      });
      const body = (await response.json()) as FeedbackBody[];

      expect(response.status).toBe(200);
      expect(body.some((f) => f.id === feedback.id)).toBe(true);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Director of projetos lists feedback', async () => {
      const { project, feedback } = await createFinalizedProjectWithFeedback();
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor Feedback GET',
        email: `diretor.feedback.get.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        headers: { Authorization: `Bearer ${director.token}` },
      });
      const body = (await response.json()) as FeedbackBody[];

      expect(response.status).toBe(200);
      expect(body.some((f) => f.id === feedback.id)).toBe(true);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Consultant is forbidden even if they submitted feedback', async () => {
      const { consultor, project } = await createFinalizedProjectWithFeedback();

      const response = await fetch(`${BASE_URL}/${project.id}/feedback`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Unknown project', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente Feedback GET Unknown',
        email: `gerente.feedback.get.unknown.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/feedback`,
        { headers: { Authorization: `Bearer ${manager.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list feedback', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/feedback`,
      );

      expect(response.status).toBe(401);
    });
  });
});
