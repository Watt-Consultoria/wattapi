import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type StageReviewBody = {
  id: string;
  submission_id: string;
  approved: boolean;
  reviewed_at: string;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço StageReviews GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerProjectStage() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente StageReviews GET ${Date.now()}`,
    email: `gerente.stagereviews.get.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor StageReviews GET ${Date.now()}`,
    email: `consultor.stagereviews.get.${Date.now()}.${Math.random()}@watt-test.com`,
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

describe('GET /projects/:id/stages/:stageId/reviews', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing reviews ordered by reviewed_at desc', async () => {
      const { manager, consultor, project, stage } =
        await createManagerProjectStage();
      const path1 = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'v1.txt',
      );
      const submission1 =
        await orchestrator.database.seed.createStageSubmission({
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
      const review1 = await orchestrator.database.seed.createStageReview({
        submission_id: submission1.id,
        approved: false,
        new_delivery_date: '2026-12-20',
        reviewed_by: manager.id,
        deliverable_ids: [stage.deliverables[0].id],
      });

      const path2 = await orchestrator.database.seed.uploadProjectStageFile(
        consultor.id,
        'v2.txt',
      );
      const submission2 =
        await orchestrator.database.seed.createStageSubmission({
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
      const review2 = await orchestrator.database.seed.createStageReview({
        submission_id: submission2.id,
        approved: true,
        reviewed_by: manager.id,
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as StageReviewBody[];

      expect(response.status).toBe(200);
      const ids = body.map((r) => r.id);
      expect(ids.indexOf(review2.id)).toBeLessThan(ids.indexOf(review1.id));
    });

    test('Unknown stage', async () => {
      const { consultor, project } = await createManagerProjectStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/00000000-0000-0000-0000-000000000001/reviews`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list reviews', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages/00000000-0000-0000-0000-000000000001/reviews`,
      );

      expect(response.status).toBe(401);
    });
  });
});
