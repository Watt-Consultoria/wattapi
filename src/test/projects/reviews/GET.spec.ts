import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type ProjectReviewBody = {
  id: string;
  round: number;
  approved: boolean;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço ProjectReviews GET ${Date.now()}-${portfolioNameSeq++}`;
}

async function createManagerWithProject() {
  const manager = await orchestrator.database.seed.createUser({
    username: `Gerente ProjectReviews GET ${Date.now()}`,
    email: `gerente.projectreviews.get.${Date.now()}.${Math.random()}@watt-test.com`,
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

describe('GET /projects/:id/reviews', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing rounds ordered by round DESC', async () => {
      const { project } = await createManagerWithProject();
      const director = await orchestrator.database.seed.createUser({
        username: 'Diretor ProjectReviews GET List',
        email: `diretor.projectreviews.get.list.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor ProjectReviews GET List',
        email: `consultor.projectreviews.get.list.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const round1 = await orchestrator.database.seed.createProjectReview({
        project_id: project.id,
        round: 1,
        approved: false,
        reviewer_id: director.id,
      });
      const round2 = await orchestrator.database.seed.createProjectReview({
        project_id: project.id,
        round: 2,
        approved: true,
        reviewer_id: director.id,
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectReviewBody[];

      expect(response.status).toBe(200);
      const ids = body.map((r) => r.id);
      expect(ids.indexOf(round2.id)).toBeLessThan(ids.indexOf(round1.id));
    });

    test('Empty array when never reviewed', async () => {
      const { project } = await createManagerWithProject();
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor ProjectReviews GET Empty',
        email: `consultor.projectreviews.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${project.id}/reviews`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectReviewBody[];

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    test('Unknown project', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor ProjectReviews GET Unknown',
        email: `consultor.projectreviews.get.unknown.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/reviews`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list reviews', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001/reviews`,
      );

      expect(response.status).toBe(401);
    });
  });
});
