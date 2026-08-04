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

async function makeLeadAndPortfolio(managerId: string) {
  const lead = await orchestrator.database.seed.createLead({
    created_by: managerId,
  });
  const portfolioItem = await orchestrator.database.seed.createPortfolioItem({
    name: `Serviço POST Projects ${Date.now()}-${portfolioNameSeq++}`,
  });
  return { lead, portfolioItem };
}

function makePayload(leadId: string, projectTypeId: string) {
  return {
    lead_id: leadId,
    project_type_id: projectTypeId,
    name: 'Projeto Watt',
    description: 'Descrição do projeto',
    delivery_date: '2027-01-01',
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /projects', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Trying to create a project', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Projects',
        email: `consultor.post.projects.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(lead.id, portfolioItem.id)),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Creating a project', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Projects',
        email: `gerente.post.projects.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(lead.id, portfolioItem.id)),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.lead_id).toBe(lead.id);
      expect(body.project_type_id).toBe(portfolioItem.id);
      expect(body.name).toBe('Projeto Watt');
      expect(body.status).toBe('em_andamento');
      expect(body.created_by).toBe(user.id);
    });

    test('Creating a project without description', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Projects 2',
        email: `gerente.post.projects2.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead.id,
          project_type_id: portfolioItem.id,
          name: 'Projeto sem descrição',
          delivery_date: '2027-01-01',
        }),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(201);
      expect(body.description).toBeNull();
    });

    test('Missing required fields', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Projects 3',
        email: `gerente.post.projects3.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Projeto incompleto' }),
      });

      expect(response.status).toBe(400);
    });

    test('Lead does not exist', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Projects 4',
        email: `gerente.post.projects4.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: `Serviço POST Projects Lead404 ${Date.now()}`,
        });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          makePayload('00000000-0000-0000-0000-000000000001', portfolioItem.id),
        ),
      });

      expect(response.status).toBe(404);
    });

    test('Project type does not exist', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Projects 5',
        email: `gerente.post.projects5.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const lead = await orchestrator.database.seed.createLead({
        created_by: user.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          makePayload(lead.id, '00000000-0000-0000-0000-000000000001'),
        ),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to create a project', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor POST Projects',
        email: `diretor.post.projects.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(lead.id, portfolioItem.id)),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a project', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Projects',
        email: `assessor.post.projects.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(lead.id, portfolioItem.id)),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(201);
      expect(body.created_by).toBe(user.id);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a project', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Projects',
        email: `presidente.post.projects.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const { lead, portfolioItem } = await makeLeadAndPortfolio(user.id);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(lead.id, portfolioItem.id)),
      });
      const body = (await response.json()) as ProjectBody;

      expect(response.status).toBe(201);
      expect(body.created_by).toBe(user.id);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create a project', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          makePayload(
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001',
          ),
        ),
      });

      expect(response.status).toBe(401);
    });
  });
});
