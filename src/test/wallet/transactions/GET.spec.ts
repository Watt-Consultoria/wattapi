import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/wallet/transactions';

type WalletTransactionBody = {
  id: string;
  account_id: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /wallet/transactions', () => {
  describe('Authenticated PRESIDENTE', () => {
    test('Listing all transactions', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Wallet Transactions',
        email: `wallet.tx.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });
      const transaction =
        await orchestrator.database.seed.createWalletTransaction({
          account_id: account.id,
          created_by: presidente.id,
        });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as WalletTransactionBody[];

      expect(response.status).toBe(200);
      expect(body.find((t) => t.id === transaction.id)).toBeDefined();
    });

    test('Filtering transactions by account_id', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente GET Wallet Transactions Filter',
        email: `wallet.tx.get.filter.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const accountA = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        name: 'Conta A',
      });
      const accountB = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        name: 'Conta B',
      });
      const txA = await orchestrator.database.seed.createWalletTransaction({
        account_id: accountA.id,
        created_by: presidente.id,
      });
      await orchestrator.database.seed.createWalletTransaction({
        account_id: accountB.id,
        created_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}?account_id=${accountA.id}`, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as WalletTransactionBody[];

      expect(response.status).toBe(200);
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((t) => t.account_id === accountA.id)).toBe(true);
      expect(body.find((t) => t.id === txA.id)).toBeDefined();
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to list transactions', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente GET Wallet Transactions',
        email: `wallet.tx.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to list transactions', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Wallet Transactions',
        email: `wallet.tx.get.consultor.${Date.now()}@watt-test.com`,
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
    test('Trying to list transactions', async () => {
      const response = await fetch(BASE_URL);

      expect(response.status).toBe(401);
    });
  });
});
