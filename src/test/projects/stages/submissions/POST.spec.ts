import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type SubmissionBody = {
  id: string;
  stage_id: string;
  notes: string | null;
  attempt: number;
  submitted_by: string;
  files: Array<{ id: string; deliverable_id: string; name: string }>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Submissions POST ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerProjectStage(stageStatus = 'pendente') {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Submissions POST ${Date.now()}`,
    email: `gerente.submissions.post.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Submissions POST ${Date.now()}`,
    email: `consultor.submissions.post.${Date.now()}.${Math.random()}@watt-test.com`,
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
  });
  const stage = await orchestrator.database.seed.createProjectStage({
    project_id: project.id,
    consultant_id: consultor.id,
    created_by: manager.id,
    status: stageStatus,
    deliverables: [{ name: 'Relatório', description: 'Relatório final' }],
  });
  return { manager, consultor, project, stage };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /projects/:id/stages/:stageId/submissions', () => {
  describe('Authenticated CONSULTOR (assigned)', () => {
    test('Successful first submission notifies the manager', async () => {
      const { manager, consultor, project, stage } =
        await createManagerProjectStage();
      const path = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'relatorio.txt',
      );

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notes: 'Entrega concluída',
            files: [
              {
                deliverable_id: stage.deliverables[0].id,
                path,
                name: 'relatorio.txt',
              },
            ],
          }),
        },
      );
      const body = (await response.json()) as SubmissionBody;

      expect(response.status).toBe(201);
      expect(body.stage_id).toBe(stage.id);
      expect(body.attempt).toBe(1);
      expect(body.submitted_by).toBe(consultor.id);
      expect(body.files).toHaveLength(1);

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${manager.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Resubmission after rejection increments the attempt', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();
      const firstPath = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'primeira.txt',
      );
      await orchestrator.database.seed.createStageSubmission({
        stage_id: stage.id,
        submitted_by: consultor.id,
        attempt: 1,
        files: [
          {
            deliverable_id: stage.deliverables[0].id,
            path: firstPath,
            name: 'primeira.txt',
          },
        ],
      });
      const path = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'segunda.txt',
      );

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                deliverable_id: stage.deliverables[0].id,
                path,
                name: 'segunda.txt',
              },
            ],
          }),
        },
      );
      const body = (await response.json()) as SubmissionBody;

      expect(response.status).toBe(201);
      expect(body.attempt).toBe(2);
    });

    test('Missing a deliverable file', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: [] }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('File path not found in storage', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                deliverable_id: stage.deliverables[0].id,
                path: `stage-files/${consultor.id}/nao-existe.txt`,
                name: 'nao-existe.txt',
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Stage is not pendente', async () => {
      const { consultor, project, stage } =
        await createManagerProjectStage('em_revisao');
      const path = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'arquivo.txt',
      );

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                deliverable_id: stage.deliverables[0].id,
                path,
                name: 'arquivo.txt',
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(409);
    });

    test('Unknown stage', async () => {
      const { consultor, project } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/00000000-0000-0000-0000-000000000001/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: [] }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated CONSULTOR (not assigned)', () => {
    test('Trying to submit for a stage assigned to someone else', async () => {
      const { project, stage } = await createManagerProjectStage();
      const otherConsultor = await orchestrator.database.seed.createUser({
        username: 'Consultor Submissions POST Other',
        email: `consultor.submissions.post.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const path = await orchestrator.database.seed.uploadProjectStageFile(
        otherConsultor.id,
        'arquivo.txt',
      );

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${otherConsultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                deliverable_id: stage.deliverables[0].id,
                path,
                name: 'arquivo.txt',
              },
            ],
          }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to submit', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages/00000000-0000-0000-0000-000000000001/submissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [] }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
