import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type StageBody = {
  id: string;
  project_id: string;
  position: number;
  consultant_id: string;
  status: string;
  deliverables: Array<{ id: string; name: string; description: string }>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Stages GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProject() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Stages GET ${Date.now()}`,
    email: `gerente.stages.get.${Date.now()}.${Math.random()}@watt-test.com`,
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
  });
  return { manager, project };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects/:id/stages', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing stages ordered by position', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET List',
        email: `consultor.stages.get.list.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const stage2 = await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        position: 2,
      });
      const stage1 = await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        position: 1,
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as StageBody[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThanOrEqual(2);
      const ids = body.map((s) => s.id);
      expect(ids.indexOf(stage1.id)).toBeLessThan(ids.indexOf(stage2.id));
      expect(body[0].deliverables.length).toBeGreaterThan(0);
    });

    test('Filtering by consultant_id', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET FilterA',
        email: `consultor.stages.get.filtera.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET FilterB',
        email: `consultor.stages.get.filterb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const stageA = await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultorA.id,
        created_by: manager.id,
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultorB.id,
        created_by: manager.id,
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages?consultant_id=${consultorA.id}`,
        { headers: { Authorization: `Bearer ${consultorA.token}` } },
      );
      const body = (await response.json()) as StageBody[];

      expect(response.status).toBe(200);
      expect(body.every((s) => s.consultant_id === consultorA.id)).toBe(true);
      expect(body.some((s) => s.id === stageA.id)).toBe(true);
    });

    test('Filtering by status', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET Status',
        email: `consultor.stages.get.status.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const pendingStage = await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        status: 'pendente',
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        status: 'concluida',
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages?status=pendente`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as StageBody[];

      expect(response.status).toBe(200);
      expect(body.every((s) => s.status === 'pendente')).toBe(true);
      expect(body.some((s) => s.id === pendingStage.id)).toBe(true);
    });

    test('Listing stages for an unknown project', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET UnknownProject',
        email: `consultor.stages.get.unknownproject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });

    test('Fetching a single stage with deliverables', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET ById',
        email: `consultor.stages.get.byid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const stage = await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as StageBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(stage.id);
      expect(body.deliverables.length).toBeGreaterThan(0);
    });

    test('Fetching an unknown stage', async () => {
      const { project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages GET UnknownStage',
        email: `consultor.stages.get.unknownstage.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list stages', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages`,
      );

      expect(response.status).toBe(401);
    });
  });
});
