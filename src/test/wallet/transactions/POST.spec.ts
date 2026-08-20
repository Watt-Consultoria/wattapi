import orchestrator from '../../orchestrator';

const BASE_URL = 'http://localhost:3001/wallet/transactions';
const ACCOUNTS_URL = 'http://localhost:3001/wallet/accounts';

type WalletTransactionBody = {
  id: string;
  account_id: string;
  type: string;
  amount_cents: number;
  category: string;
};

async function fetchAccountBalance(
  token: string,
  accountId: string,
): Promise<number> {
  const response = await fetch(`${ACCOUNTS_URL}/${accountId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await response.json()) as { balance_cents: number };
  return body.balance_cents;
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /wallet/transactions', () => {
  describe('Authenticated PRESIDENTE', () => {
    test('Creating an expense transaction decreases the account balance', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Expense',
        email: `wallet.tx.post.expense.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        balance_cents: 10000,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'expense',
          amount_cents: 3000,
          category: 'outro',
          description: 'Despesa de teste',
          transaction_date: '2026-01-05',
        }),
      });
      const body = (await response.json()) as WalletTransactionBody;

      expect(response.status).toBe(201);
      expect(body.account_id).toBe(account.id);
      expect(body.type).toBe('expense');
      expect(body.amount_cents).toBe(3000);

      const balance = await fetchAccountBalance(presidente.token, account.id);
      expect(balance).toBe(7000);
    });

    test('Creating an income transaction increases the account balance', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Income',
        email: `wallet.tx.post.income.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        balance_cents: 10000,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'income',
          amount_cents: 5000,
          category: 'outro',
          description: 'Receita de teste',
          transaction_date: '2026-01-05',
        }),
      });
      const body = (await response.json()) as WalletTransactionBody;

      expect(response.status).toBe(201);
      expect(body.type).toBe('income');

      const balance = await fetchAccountBalance(presidente.token, account.id);
      expect(balance).toBe(15000);
    });

    test('Expense larger than balance still succeeds and balance goes negative', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Negative',
        email: `wallet.tx.post.negative.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
        balance_cents: 1000,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'expense',
          amount_cents: 5000,
          category: 'outro',
          description: 'Despesa maior que o saldo',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(201);

      const balance = await fetchAccountBalance(presidente.token, account.id);
      expect(balance).toBe(-4000);
    });

    test('Account not found', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions 404',
        email: `wallet.tx.post.404.${Date.now()}@watt-test.com`,
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
          account_id: '00000000-0000-0000-0000-000000000001',
          type: 'expense',
          amount_cents: 1000,
          category: 'outro',
          description: 'Conta inexistente',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(404);
    });

    test('Invalid category value', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Invalid Category',
        email: `wallet.tx.post.invalidcat.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'expense',
          amount_cents: 1000,
          category: 'categoria_invalida',
          description: 'Categoria inválida',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Invalid type value', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Invalid Type',
        email: `wallet.tx.post.invalidtype.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'transferencia',
          amount_cents: 1000,
          category: 'outro',
          description: 'Tipo inválido',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('amount_cents zero or negative', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Amount',
        email: `wallet.tx.post.amount.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: presidente.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${presidente.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'expense',
          amount_cents: 0,
          category: 'outro',
          description: 'Valor zero',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Missing required fields', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente POST Wallet Transactions Missing',
        email: `wallet.tx.post.missing.${Date.now()}@watt-test.com`,
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
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to create a transaction', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'Diretor POST Wallet Transactions',
        email: `wallet.tx.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const account = await orchestrator.database.seed.createWalletAccount({
        created_by: diretor.id,
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${diretor.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: account.id,
          type: 'expense',
          amount_cents: 1000,
          category: 'outro',
          description: 'Não pode',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create a transaction', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: '00000000-0000-0000-0000-000000000001',
          type: 'expense',
          amount_cents: 1000,
          category: 'outro',
          description: 'Sem auth',
          transaction_date: '2026-01-05',
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
