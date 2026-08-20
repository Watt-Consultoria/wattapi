import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/wallet/accounts';

type WalletAccountBody = {
  id: string;
  name: string;
  type: string;
  balance_cents: number;
  created_by: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /wallet/accounts', () => {
  describe('Authenticated PRESIDENTE', () => {
    test('Creating an account with default balance_cents', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Accounts',
        email: `wallet.accounts.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Corrente', type: 'checking' }),
      });
      const body = (await response.json()) as WalletAccountBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Conta Corrente');
      expect(body.type).toBe('checking');
      expect(body.balance_cents).toBe(0);
      expect(body.created_by).toBe(presidente.id);
    });

    test('Creating an account with explicit balance_cents', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Accounts 2',
        email: `wallet.accounts.post.presidente2.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Conta Investimento',
          type: 'investment',
          balance_cents: 150000,
        }),
      });
      const body = (await response.json()) as WalletAccountBody;

      expect(response.status).toBe(201);
      expect(body.balance_cents).toBe(150000);
    });

    test('Missing required fields', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Accounts Missing',
        email: `wallet.accounts.post.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    test('Invalid type value', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Accounts Invalid Type',
        email: `wallet.accounts.post.invalidtype.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Inválida', type: 'crypto' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to create an account', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor POST Wallet Accounts',
        email: `wallet.accounts.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${diretor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Proibida', type: 'checking' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Trying to create an account', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Wallet Accounts',
        email: `wallet.accounts.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${assessor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Proibida', type: 'checking' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to create an account', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Wallet Accounts',
        email: `wallet.accounts.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gerente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Proibida', type: 'checking' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated CONSULTOR', () => {
    test('Trying to create an account', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Wallet Accounts',
        email: `wallet.accounts.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${consultor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Proibida', type: 'checking' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create an account', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Conta Sem Auth', type: 'checking' }),
      });

      expect(response.status).toBe(401);
    });
  });
});
