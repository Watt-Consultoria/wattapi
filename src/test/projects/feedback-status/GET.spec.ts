import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects/feedback-status';

type PendingFeedbacksBody = {
  pending_feedbacks: string[];
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Feedback Status GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerAndConsultant() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Feedback Status GET ${Date.now()}`,
    email: `gerente.feedback.status.get.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Feedback Status GET ${Date.now()}`,
    email: `consultor.feedback.status.get.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'consultor',
    sector: 'projetos',
  });
  return { manager, consultor };
}

async function createProjectWithStage({
  manager,
  consultor,
  status,
}: {
  manager: { id: string };
  consultor: { id: string };
  status: string;
}) {
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
    status: status === 'em_andamento' ? 'pendente' : 'concluida',
  });
  return project;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects/feedback-status', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Lists finalized projects with an assigned stage and no feedback yet', async () => {
      const { manager, consultor } = await createManagerAndConsultant();
      const project = await createProjectWithStage({
        manager,
        consultor,
        status: 'finalizado',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as PendingFeedbacksBody;

      expect(response.status).toBe(200);
      expect(body.pending_feedbacks).toContain(project.id);
    });

    test('Excludes projects the consultant already submitted feedback for', async () => {
      const { manager, consultor } = await createManagerAndConsultant();
      const project = await createProjectWithStage({
        manager,
        consultor,
        status: 'finalizado',
      });
      await orchestrator.database.seed.createProjectFeedback({
        project_id: project.id,
        consultor_id: consultor.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as PendingFeedbacksBody;

      expect(response.status).toBe(200);
      expect(body.pending_feedbacks).not.toContain(project.id);
    });

    test('Excludes projects that are not finalizado yet', async () => {
      const { manager, consultor } = await createManagerAndConsultant();
      const project = await createProjectWithStage({
        manager,
        consultor,
        status: 'em_andamento',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as PendingFeedbacksBody;

      expect(response.status).toBe(200);
      expect(body.pending_feedbacks).not.toContain(project.id);
    });

    test('Excludes projects with no stage assigned to the consultant', async () => {
      const { manager, consultor } = await createManagerAndConsultant();
      const otherConsultant = await orchestrator.database.seed.createUser({
        username: 'Outro Consultor Feedback Status GET',
        email: `outro.consultor.feedback.status.get.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const project = await createProjectWithStage({
        manager,
        consultor: otherConsultant,
        status: 'finalizado',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as PendingFeedbacksBody;

      expect(response.status).toBe(200);
      expect(body.pending_feedbacks).not.toContain(project.id);
    });

    test('Returns an empty array when there is nothing pending', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Feedback Status GET Empty',
        email: `consultor.feedback.status.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as PendingFeedbacksBody;

      expect(response.status).toBe(200);
      expect(body.pending_feedbacks).toEqual([]);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to access feedback-status', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente Feedback Status GET Forbidden',
        email: `gerente.feedback.status.get.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${manager.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to access feedback-status', async () => {
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor Feedback Status GET Forbidden',
        email: `diretor.feedback.status.get.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${director.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to access feedback-status', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
