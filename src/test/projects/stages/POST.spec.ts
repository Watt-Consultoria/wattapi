import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type StageBody = {
  id: string;
  project_id: string;
  delivery_date: string;
  deadline_date: string;
  name: string;
  description: string;
  position: number;
  consultant_id: string;
  status: string;
  deliverables: Array<{ id: string; name: string; description: string }>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Stages POST ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProject(deliveryDate = '2027-06-01') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Stages POST ${Date.now()}`,
    email: `gerente.stages.post.${Date.now()}.${Math.random()}@watt-test.com`,
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
    delivery_date: deliveryDate,
  });
  return { manager, project };
}

function makePayload(consultantId: string) {
  return {
    delivery_date: '2026-12-01',
    deadline_date: '2026-12-15',
    name: 'Diagnóstico Técnico',
    description: 'Levantamento técnico inicial',
    position: 1,
    consultant_id: consultantId,
    deliverables: [
      { name: 'Relatório', description: 'Relatório de diagnóstico' },
    ],
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /projects/:id/stages', () => {
  describe('Authenticated GERENTE', () => {
    test('Creating a stage notifies the assigned consultant', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST',
        email: `consultor.stages.post.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(consultor.id)),
      });
      const body = (await response.json()) as StageBody;

      expect(response.status).toBe(201);
      expect(body.project_id).toBe(project.id);
      expect(body.status).toBe('pendente');
      expect(body.consultant_id).toBe(consultor.id);
      expect(body.deliverables).toHaveLength(1);
      expect(body.deliverables[0].name).toBe('Relatório');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Delivery date on or after deadline date', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST DateBad',
        email: `consultor.stages.post.datebad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...makePayload(consultor.id),
          delivery_date: '2026-12-15',
          deadline_date: '2026-12-15',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Stage delivery date after the project delivery date', async () => {
      const { manager, project } = await createManagerWithProject('2026-11-01');
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST AfterProject',
        email: `consultor.stages.post.afterproject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(consultor.id)),
      });

      expect(response.status).toBe(400);
    });

    test('No deliverables provided', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST NoDeliverables',
        email: `consultor.stages.post.nodeliverables.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...makePayload(consultor.id),
          deliverables: [],
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Consultant does not exist', async () => {
      const { manager, project } = await createManagerWithProject();

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          makePayload('00000000-0000-0000-0000-000000000001'),
        ),
      });

      expect(response.status).toBe(404);
    });

    test('Project does not exist', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente Stages POST NoProject',
        email: `gerente.stages.post.noproject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST NoProject',
        email: `consultor.stages.post.noproject.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(makePayload(consultor.id)),
        },
      );

      expect(response.status).toBe(404);
    });

    test('Project is not em_andamento', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST NotAndamento',
        email: `consultor.stages.post.notandamento.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createProject({
        lead_id: project.lead_id,
        project_type_id: project.project_type_id,
        created_by: manager.id,
      });

      const otherProject = await orchestrator.database.seed.createProject({
        lead_id: project.lead_id,
        project_type_id: project.project_type_id,
        created_by: manager.id,
        status: 'finalizado',
      });

      const response = await fetch(`${BASE_URL}/${otherProject.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(consultor.id)),
      });

      expect(response.status).toBe(409);
    });

    test('A different manager cannot create a stage', async () => {
      const { project } = await createManagerWithProject();
      const otherManager = await orchestrator.database.seed.createUser({
        username: 'Gerente Stages POST Other',
        email: `gerente.stages.post.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST Other',
        email: `consultor.stages.post.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${otherManager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(consultor.id)),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to create a stage', async () => {
      const { project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Stages POST Forbidden',
        email: `consultor.stages.post.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/stages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(consultor.id)),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create a stage', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            makePayload('00000000-0000-0000-0000-000000000001'),
          ),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
