import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/wallet/accounts';

type WalletAccountBody = {
  id: string;
  name: string;
  balance_cents: number;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /wallet/accounts', () => {
  describe('Authenticated PRESIDENTE', () => {
    test('Listing all accounts', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Wallet Accounts',
        email: `wallet.accounts.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        balance_cents: 42000,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as WalletAccountBody[];

      expect(response.status).toBe(200);
      const found = body.find((a) => a.id === account.id);
      expect(found).toBeDefined();
      expect(found?.balance_cents).toBe(42000);
    });

    test('Fetching a single account', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Wallet Account By Id',
        email: `wallet.accounts.getbyid.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${account.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as WalletAccountBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(account.id);
    });

    test('Single account not found', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Wallet Account 404',
        email: `wallet.accounts.get404.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${presidente.token}` } },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Listing all accounts', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor GET Wallet Accounts',
        email: `wallet.accounts.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Listing all accounts', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor GET Wallet Accounts',
        email: `wallet.accounts.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to list accounts', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Wallet Accounts',
        email: `wallet.accounts.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(403);
    });

    test('Trying to fetch a single account', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Wallet Account By Id',
        email: `wallet.accounts.getbyid.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${gerente.token}` } },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to list accounts', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Wallet Accounts',
        email: `wallet.accounts.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to list accounts', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
