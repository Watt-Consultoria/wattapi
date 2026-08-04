import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type SubmissionBody = {
  id: string;
  stage_id: string;
  attempt: number;
  files: Array<{
    id: string;
    deliverable_id: string;
    name: string;
    signed_url?: string;
  }>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Submissions GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerProjectStage() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente Submissions GET ${Date.now()}`,
    email: `gerente.submissions.get.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor Submissions GET ${Date.now()}`,
    email: `consultor.submissions.get.${Date.now()}.${Math.random()}@watt-test.com`,
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
    deliverables: [{ name: 'Relatório', description: 'Relatório final' }],
  });
  return { manager, consultor, project, stage };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects/:id/stages/:stageId/submissions', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing submissions ordered by attempt desc', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();
      const path1 = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'v1.txt',
      );
      const path2 = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'v2.txt',
      );
      const attempt1 = await orchestrator.database.seed.createStageSubmission({
        stage_id: stage.id,
        submitted_by: consultor.id,
        attempt: 1,
        files: [
          {
            deliverable_id: stage.deliverables[0].id,
            path: path1,
            name: 'v1.txt',
          },
        ],
      });
      const attempt2 = await orchestrator.database.seed.createStageSubmission({
        stage_id: stage.id,
        submitted_by: consultor.id,
        attempt: 2,
        files: [
          {
            deliverable_id: stage.deliverables[0].id,
            path: path2,
            name: 'v2.txt',
          },
        ],
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as SubmissionBody[];

      expect(response.status).toBe(200);
      const ids = body.map((s) => s.id);
      expect(ids.indexOf(attempt2.id)).toBeLessThan(ids.indexOf(attempt1.id));
      expect(body[0].files.length).toBeGreaterThan(0);
    });

    test('Unknown stage', async () => {
      const { consultor, project } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/00000000-0000-0000-0000-000000000001/submissions`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });

    test('Fetching a single submission with signed URLs', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();
      const path = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'final.txt',
      );
      const submission = await orchestrator.database.seed.createStageSubmission(
        {
          stage_id: stage.id,
          submitted_by: consultor.id,
          attempt: 1,
          files: [
            {
              deliverable_id: stage.deliverables[0].id,
              path,
              name: 'final.txt',
            },
          ],
        },
      );

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions/${submission.id}`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as SubmissionBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(submission.id);
      expect(body.files[0].signed_url).toBeDefined();
    });

    test('Fetching an unknown submission', async () => {
      const { consultor, project, stage } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/submissions/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list submissions', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages/00000000-0000-0000-0000-000000000001/submissions`,
      );

      expect(response.status).toBe(401);
    });
  });
});
