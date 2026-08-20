import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/wallet/accounts';

type WalletAccountBody = {
  id: string;
  name: string;
  type: string;
  balance_cents: number;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /wallet/accounts/:id', () => {
  describe('Authenticated PRESIDENTE', () => {
    test('Updating name and type', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH Wallet Accounts',
        email: `wallet.accounts.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${account.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Conta Renomeada', type: 'savings' }),
      });
      const body = (await response.json()) as WalletAccountBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(account.id);
      expect(body.name).toBe('Conta Renomeada');
      expect(body.type).toBe('savings');
    });

    test('Invalid type value on edit', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH Wallet Accounts Invalid',
        email: `wallet.accounts.patch.invalid.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(`${BASE_URL}/${account.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'crypto' }),
      });

      expect(response.status).toBe(400);
    });

    test('Account not found', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH Wallet Accounts 404',
        email: `wallet.accounts.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${presidente.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Não existe' }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to edit an account', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor PATCH Wallet Accounts',
        email: `wallet.accounts.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: diretor.id,
      });

      const response = await fetch(`${BASE_URL}/${account.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${diretor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Não pode' }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to edit an account', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Não pode' }),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});
