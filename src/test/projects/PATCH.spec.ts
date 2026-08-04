import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type ProjectBody = {
  id: string;
  status: string;
  closing_notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço PATCH Projects ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProject(status = 'em_andamento') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente PATCH ${Date.now()}`,
    email: `gerente.patch.${Date.now()}.${Math.random()}@watt-test.com`,
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

describe('PATCH /projects/:id', () => {
  describe('Authenticated GERENTE', () => {
    test('Submitting for review when all stages are concluida', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Stage',
        email: `consultor.patch.stage.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        status: 'concluida',
      });
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH Notify',
        email: `diretor.patch.notify.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'em_revisao' }),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(200);
      expect(body.status).toBe('em_revisao');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${director.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Submission blocked when a stage is not concluida', async () => {
      const { manager, project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Pending Stage',
        email: `consultor.patch.pending.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        status: 'pendente',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'em_revisao' }),
      });

      expect(response.status).toBe(409);
    });

    test('Submission blocked when the project has no stages', async () => {
      const { manager, project } = await createManagerWithProject();

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'em_revisao' }),
      });

      expect(response.status).toBe(409);
    });

    test('A different manager cannot submit the project for review', async () => {
      const { project } = await createManagerWithProject();
      const otherManager = await orchestrator.database.seed.createUser({
        username: 'Gerente PATCH Other',
        email: `gerente.patch.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${otherManager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'em_revisao' }),
      });

      expect(response.status).toBe(403);
    });

    test('Cannot resubmit a project that is not em_andamento', async () => {
      const { manager, project } = await createManagerWithProject('em_revisao');

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'em_revisao' }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Closing a revisado project with notes', async () => {
      const { manager, project } = await createManagerWithProject('revisado');
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor PATCH Close',
        email: `consultor.patch.close.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: project.id,
        consultant_id: consultor.id,
        created_by: manager.id,
        status: 'concluida',
      });
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH Close',
        email: `diretor.patch.close.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'finalizado',
          closing_notes: 'Projeto entregue com sucesso',
        }),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(200);
      expect(body.status).toBe('finalizado');
      expect(body.closing_notes).toBe('Projeto entregue com sucesso');
      expect(body.closed_by).toBe(director.id);
      expect(body.closed_at).toBeDefined();

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Closing without closing_notes', async () => {
      const { project } = await createManagerWithProject('revisado');
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH NoNotes',
        email: `diretor.patch.nonotes.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'finalizado' }),
      });

      expect(response.status).toBe(400);
    });

    test('Closing a project that is not revisado', async () => {
      const { project } = await createManagerWithProject('em_andamento');
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH NotRevisado',
        email: `diretor.patch.notrevisado.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'finalizado',
          closing_notes: 'Notas',
        }),
      });

      expect(response.status).toBe(409);
    });

    test('Non-director sector cannot close a project', async () => {
      const { project } = await createManagerWithProject('revisado');
      const otherDirector = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH WrongSector',
        email: `diretor.patch.wrongsector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${otherDirector.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'finalizado',
          closing_notes: 'Notas',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Finalized project immutability', () => {
    test('Any PATCH on a finalizado project is rejected', async () => {
      const { project } = await createManagerWithProject('finalizado');
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH Finalized',
        email: `diretor.patch.finalized.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${director.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'finalizado',
          closing_notes: 'Notas',
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to update a project', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'em_revisao' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
