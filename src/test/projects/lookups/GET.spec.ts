import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/projects/lookups';

type LookupsBody = {
  leads: Array<{ id: string; company_name: string; status: string }>;
  portfolio_items: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  consultants: Array<{ id: string; name: string; email: string }>;
};

let portfolioNameSeq = 0;

function nextPortfolioName(): string {
  return `Serviço Lookups GET ${Date.now()}-${portfolioNameSeq++}`;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /projects/lookups', () => {
  describe('Authenticated GERENTE', () => {
    test('Returns only em_progresso leads, all portfolio items, and active projetos consultants', async () => {
      const manager = await orchestrator.database.seed.createUser({
        username: 'Gerente Lookups GET',
        email: `gerente.lookups.get.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const leadInProgress = await orchestrator.database.seed.createLead({
        created_by: manager.id,
        status: 'em_progresso',
      });
      await orchestrator.database.seed.createLead({
        created_by: manager.id,
        status: 'contatado',
      });
      await orchestrator.database.seed.createLead({
        created_by: manager.id,
        status: 'nao_contatado',
      });

      const portfolioItem =
        await orchestrator.database.seed.createPortfolioItem({
          name: nextPortfolioName(),
        });

      const activeConsultant = await orchestrator.database.seed.createUser({
        username: 'Consultor Lookups Active',
        email: `consultor.lookups.active.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const inactiveConsultant = await orchestrator.database.seed.createUser({
        username: 'Consultor Lookups Inactive',
        email: `consultor.lookups.inactive.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      await orchestrator.database.seed.deactivateUser(inactiveConsultant.id);
      const otherSectorConsultant = await orchestrator.database.seed.createUser(
        {
          username: 'Consultor Lookups OtherSector',
          email: `consultor.lookups.othersector.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        },
      );

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${manager.token}` },
      });
      const body = (await response.json()) as LookupsBody;

      expect(response.status).toBe(200);

      const leadIds = body.leads.map((l) => l.id);
      expect(leadIds).toContain(leadInProgress.id);
      expect(body.leads.every((l) => l.status === 'em_progresso')).toBe(true);

      expect(body.portfolio_items.some((p) => p.id === portfolioItem.id)).toBe(
        true,
      );

      const consultantIds = body.consultants.map((c) => c.id);
      expect(consultantIds).toContain(activeConsultant.id);
      expect(consultantIds).not.toContain(inactiveConsultant.id);
      expect(consultantIds).not.toContain(otherSectorConsultant.id);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Superuser can access the lookups', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Lookups GET',
        email: `assessor.lookups.get.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to access the lookups', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Lookups GET Forbidden',
        email: `consultor.lookups.get.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to access the lookups', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Lookups GET Forbidden',
        email: `diretor.lookups.get.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to access the lookups', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
