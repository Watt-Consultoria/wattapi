import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/projects';

type ProjectBody = {
  id: string;
  lead_id: string;
  project_type_id: string;
  name: string;
  description: string | null;
  delivery_date: string;
  status: string;
  created_by: string;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço GET Projects ${Date.now()}-${portfolioNameSeq++}`;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all projects', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET List',
        email: `gerente.get.list.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET List',
        email: `consultor.get.list.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'em_andamento',
      });
      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'finalizado',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });

    test('Filtering by status', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Status',
        email: `gerente.get.status.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Status',
        email: `consultor.get.status.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const revisado = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'revisado',
      });
      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'em_andamento',
      });

      const response = await fetch(`${BASE_URL}?status=revisado`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(body.every((p) => p.status === 'revisado')).toBe(true);
      expect(body.some((p) => p.id === revisado.id)).toBe(true);
    });

    test('Filtering by lead_id', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Lead',
        email: `gerente.get.lead.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Lead',
        email: `consultor.get.lead.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const leadA = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const leadB = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const projectA = await orchestrator.database.seed.createProject({
        lead_id: leadA.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
      });
      await orchestrator.database.seed.createProject({
        lead_id: leadB.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
      });

      const response = await fetch(`${BASE_URL}?lead_id=${leadA.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(body.every((p) => p.lead_id === leadA.id)).toBe(true);
      expect(body.some((p) => p.id === projectA.id)).toBe(true);
    });

    test('Filtering by created_by', async () => {
      const managerA = await orchestrator.database.seed.createUser({
        username: 'Gerente GET CreatedByA',
        email: `gerente.get.createdbya.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const managerB = await orchestrator.database.seed.createUser({
        username: 'Gerente GET CreatedByB',
        email: `gerente.get.createdbyb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET CreatedBy',
        email: `consultor.get.createdby.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: managerA.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const projectA = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: managerA.id,
      });
      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: managerB.id,
      });

      const response = await fetch(`${BASE_URL}?created_by=${managerA.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(body.every((p) => p.created_by === managerA.id)).toBe(true);
      expect(body.some((p) => p.id === projectA.id)).toBe(true);
    });

    test('Filtering by consultant_id', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Consultant',
        email: `gerente.get.consultant.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor GET ConsultantA',
        email: `consultor.get.consultanta.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor GET ConsultantB',
        email: `consultor.get.consultantb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const projectWithA = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: projectWithA.id,
        consultant_id: consultorA.id,
        created_by: manager.id,
      });

      const projectWithB = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
      });
      await orchestrator.database.seed.createProjectStage({
        project_id: projectWithB.id,
        consultant_id: consultorB.id,
        created_by: manager.id,
      });

      const response = await fetch(
        `${BASE_URL}?consultant_id=${consultorA.id}`,
        {
          headers: { Authorization: `Bearer ${consultorA.token}` },
        },
      );
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(body.some((p) => p.id === projectWithA.id)).toBe(true);
      expect(body.some((p) => p.id === projectWithB.id)).toBe(false);
    });

    test('Combining status and created_by filters', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Combined',
        email: `gerente.get.combined.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const otherManager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Combined Other',
        email: `gerente.get.combined.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Combined',
        email: `consultor.get.combined.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const match = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'em_andamento',
      });
      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
        status: 'finalizado',
      });
      await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: otherManager.id,
        status: 'em_andamento',
      });

      const response = await fetch(
        `${BASE_URL}?status=em_andamento&created_by=${manager.id}`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );
      const body = (await response.json()) as ProjectBody[];

      expect(response.status).toBe(200);
      expect(
        body.every(
          (p) => p.status === 'em_andamento' && p.created_by === manager.id,
        ),
      ).toBe(true);
      expect(body.some((p) => p.id === match.id)).toBe(true);
    });

    test('Fetching a single project', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente GET ById',
        email: `gerente.get.byid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET ById',
        email: `consultor.get.byid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: manager.id,
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });
      const project = await orchestrator.database.seed.createProject({
        lead_id: lead.id,
        project_type_id: portfolioItem.id,
        created_by: manager.id,
      });

      const response = await fetch(`${BASE_URL}/${project.id}`, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(project.id);
    });

    test('Fetching an unknown project', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Unknown',
        email: `consultor.get.unknown.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${consultor.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list projects', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
