import orchestrator from '../../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type StageReviewBody = {
  id: string;
  submission_id: string;
  approved: boolean;
  notes: string | null;
  new_delivery_date: string | null;
  reviewed_by: string;
  rework_deliverable_ids?: string[];
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço StageReviews POST ${Date.now()}-${portfolioNameSeq++}`;
}

async function createReviewableStage() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente StageReviews POST ${Date.now()}`,
    email: `gerente.stagereviews.post.${Date.now()}.${Math.random()}@watt-test.com`,
    password: '',
    role: 'gerente',
    sector: 'projetos',
  });
  const consultor = await orchestrator.database.seed.createUser({
    username: `Consultor StageReviews POST ${Date.now()}`,
    email: `consultor.stagereviews.post.${Date.now()}.${Math.random()}@watt-test.com`,
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
    status: 'em_revisao',
    deliverables: [{ name: 'Relatório', description: 'Relatório final' }],
  });
  const path = await orchestrator.database.seed.uploadProjectStageFile(
    consultor.id,
    'relatorio.txt',
  );
  const submission = await orchestrator.database.seed.createStageSubmission({
    stage_id: stage.id,
    submitted_by: consultor.id,
    attempt: 1,
    files: [
      { deliverable_id: stage.deliverables[0].id, path, name: 'relatorio.txt' },
    ],
  });
  return { manager, consultor, project, stage, submission };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /projects/:id/stages/:stageId/reviews', () => {
  describe('Authenticated GERENTE', () => {
    test('Approving a submission', async () => {
      const { manager, consultor, project, stage } =
        await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        },
      );
      const body = (await response.json()) as StageReviewBody;

      expect(response.status).toBe(201);
      expect(body.approved).toBe(true);

      const stageRes = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          headers: { Authorization: `Bearer ${manager.token}` },
        },
      );
      const stageBody = (await stageRes.json()) as { status: string };
      expect(stageBody.status).toBe('concluida');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Rejecting a submission with rework items', async () => {
      const { manager, consultor, project, stage } =
        await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: false,
            notes: 'Faltou anexar a planilha',
            new_delivery_date: '2026-12-10',
            deliverable_ids: [stage.deliverables[0].id],
          }),
        },
      );
      const body = (await response.json()) as StageReviewBody;

      expect(response.status).toBe(201);
      expect(body.approved).toBe(false);
      expect(body.new_delivery_date).toBe('2026-12-10');

      const stageRes = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}`,
        {
          headers: { Authorization: `Bearer ${manager.token}` },
        },
      );
      const stageBody = (await stageRes.json()) as {
        status: string;
        delivery_date: string;
      };
      expect(stageBody.status).toBe('pendente');
      expect(stageBody.delivery_date).toBe('2026-12-10');

      const notifRes = await fetch('http://localhost:3001/notifications', {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const notifications = (await notifRes.json()) as { title: string }[];
      expect(notifications.length).toBeGreaterThan(0);
    });

    test('Rejection missing new_delivery_date', async () => {
      const { manager, project, stage } = await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: false,
            deliverable_ids: [stage.deliverables[0].id],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Rejection missing rework deliverables', async () => {
      const { manager, project, stage } = await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: false,
            new_delivery_date: '2026-12-10',
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Rework deliverable not in the checklist', async () => {
      const { manager, project, stage } = await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: false,
            new_delivery_date: '2026-12-10',
            deliverable_ids: ['00000000-0000-0000-0000-000000000001'],
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test('Stage is not awaiting review', async () => {
      const { manager, project, stage } = await createReviewableStage();
      await fetch(`${BASE_URL}/${project.id}/stages/${stage.id}/reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${manager.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true }),
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        },
      );

      expect(response.status).toBe(409);
    });

    test('Submission already reviewed', async () => {
      const { manager, project, stage, submission } =
        await createReviewableStage();
      await orchestrator.database.seed.createStageReview({
        submission_id: submission.id,
        approved: true,
        reviewed_by: manager.id,
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${manager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        },
      );

      expect(response.status).toBe(409);
    });

    test('A different manager cannot review the submission', async () => {
      const { project, stage } = await createReviewableStage();
      const otherManager = await orchestrator.database.seed.createUser({
        username: 'Gerente StageReviews POST Other',
        email: `gerente.stagereviews.post.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${otherManager.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to review a submission', async () => {
      const { consultor, project, stage } = await createReviewableStage();

      const response = await fetch(
        `${BASE_URL}/${project.id}/stages/${stage.id}/reviews`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${consultor.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ approved: true }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to review a submission', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/stages/00000000-0000-0000-0000-000000000001/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
