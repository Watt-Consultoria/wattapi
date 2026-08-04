import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type StageBody = {
  id: string;
  name: string;
  consultant_id: string;
  status: string;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Stages PATCH ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProjectAndStage(status = 'pendente') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Stages PATCH ${Date.now()}`,
    email: `gerente.stages.patch.${Date.now()}.${Math.random()}@watt-test.com`,
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
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Stages PATCH ${Date.now()}`,
    email: `consultor.stages.patch.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'consultor',
    sector: 'projetos',
  });
  const stage = await orchestrator.database.seed.createProjectStage({
    project_id: project.id,
    consultant_id: consultor.id,
    created_by: manager.id,
    status,
  });
  return { manager, project, consultor, stage };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /projects/:id/stages/:stageId', () => {
  describe('Authenticated GERENTE', () => {
    test('Updating a pendente stage', async () => {
      const { manager, project, stage } =
        await createManagerWithProjectAndStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Etapa Atualizada' }),
        },
      );
      const body = (await response.json()) as StageBody;

      expect(response.status).toBe(200);
      expect(body.name).toBe('Etapa Atualizada');
    });

    test('Reassigning the consultant notifies the new consultant', async () => {
      const { manager, project, stage } =
        await createManagerWithProjectAndStage();
      const newConsultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages PATCH New',
        email: `consultor.stages.patch.new.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ consultant_id: newConsultor.id }),
        },
      );
      const body = (await response.json()) as StageBody;

      expect(response.status).toBe(200);
      expect(body.consultant_id).toBe(newConsultor.id);

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${newConsultor.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Cannot update a stage that is not pendente', async () => {
      const { manager, project, stage } =
        await createManagerWithProjectAndStage('em_revisao');

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Nova tentativa' }),
        },
      );

      expect(response.status).toBe(409);
    });

    test('Unknown stage', async () => {
      const { manager, project } = await createManagerWithProjectAndStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Nova tentativa' }),
        },
      );

      expect(response.status).toBe(404);
    });

    test('A different manager cannot update the stage', async () => {
      const { project, stage } = await createManagerWithProjectAndStage();
      const otherManager = await orchestrator.database.seed.createUser({
        username: 'Gerente Stages PATCH Other',
        email: `gerente.stages.patch.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${otherManager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Nova tentativa' }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to update a stage', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Nova tentativa' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
