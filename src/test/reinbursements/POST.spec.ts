import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/reimbursements';

type ReimbursementBody = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  amount_cents: number;
  category: string;
  pix_key: string;
  status: string;
  attachments: Array<{ id: string; name: string; signed_url: string }>;
  created_at: string;
  updated_at: string;
};

function makePayload(filePath: string) {
  return {
    title: 'Reembolso viagem SP',
    description: 'Despesas de transporte para reunião em São Paulo',
    amount_cents: 15000,
    category: 'transporte',
    pix_key: '11999990000',
    attachments: [{ path: filePath, name: 'comprovante.txt' }],
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /reimbursements', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Creating a reimbursement', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST',
        email: 'consultor.post@watt-test.com',
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const filePath = await orchestrator.database.seed.uploadFile(
        user.id,
        'comprovante.txt',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(filePath)),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
      expect(body.user_id).toBe(user.id);
      expect(body.title).toBe('Reembolso viagem SP');
      expect(body.amount_cents).toBe(15000);
      expect(body.category).toBe('transporte');
      expect(body.status).toBe('pending');
      expect(body.attachments).toHaveLength(1);
      expect(body.attachments[0].name).toBe('comprovante.txt');
      expect(body.created_at).toBeDefined();
    });

    test('Creating a reimbursement with no attachments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor POST 2',
        email: 'consultor.post2@watt-test.com',
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Reembolso viagem SP',
          description: 'Despesas de transporte para reunião em São Paulo',
          amount_cents: 15000,
          category: 'transporte',
          pix_key: '11999990000',
          attachments: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Creating a reimbursement', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente POST',
        email: 'gerente.post@watt-test.com',
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const filePath = await orchestrator.database.seed.uploadFile(
        user.id,
        'comprovante.txt',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(filePath)),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(user.id);
      expect(body.status).toBe('pending');
      expect(body.attachments).toHaveLength(1);
    });

    test('Creating a reimbursement with no attachments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'gerente POST 2',
        email: 'gerente.post2@watt-test.com',
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Reembolso viagem SP',
          description: 'Despesas de transporte para reunião em São Paulo',
          amount_cents: 15000,
          category: 'transporte',
          pix_key: '11999990000',
          attachments: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Creating a reimbursement', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor POST',
        email: 'diretor.post@watt-test.com',
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const filePath = await orchestrator.database.seed.uploadFile(
        user.id,
        'comprovante.txt',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(filePath)),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(user.id);
      expect(body.status).toBe('pending');
      expect(body.attachments).toHaveLength(1);
    });

    test('Creating a reimbursement with no attachments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'diretor POST 2',
        email: 'diretor.post2@watt-test.com',
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Reembolso viagem SP',
          description: 'Despesas de transporte para reunião em São Paulo',
          amount_cents: 15000,
          category: 'transporte',
          pix_key: '11999990000',
          attachments: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a reimbursement', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor POST',
        email: 'assessor.post@watt-test.com',
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const filePath = await orchestrator.database.seed.uploadFile(
        user.id,
        'comprovante.txt',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(filePath)),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(user.id);
      expect(body.status).toBe('pending');
      expect(body.attachments).toHaveLength(1);
    });

    test('Creating a reimbursement with no attachments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'assessor POST 2',
        email: 'assessor.post2@watt-test.com',
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Reembolso viagem SP',
          description: 'Despesas de transporte para reunião em São Paulo',
          amount_cents: 15000,
          category: 'transporte',
          pix_key: '11999990000',
          attachments: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a reimbursement', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente POST',
        email: 'presidente.post@watt-test.com',
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const filePath = await orchestrator.database.seed.uploadFile(
        user.id,
        'comprovante.txt',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(makePayload(filePath)),
      });
      const body = (await response.json()) as ReimbursementBody;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(user.id);
      expect(body.status).toBe('pending');
      expect(body.attachments).toHaveLength(1);
    });

    test('Creating a reimbursement with no attachments', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'presidente POST 2',
        email: 'presidente.post2@watt-test.com',
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Reembolso viagem SP',
          description: 'Despesas de transporte para reunião em São Paulo',
          amount_cents: 15000,
          category: 'transporte',
          pix_key: '11999990000',
          attachments: [],
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create a reimbursement', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Reembolso',
          description: 'Descrição',
          amount_cents: 5000,
          category: 'outro',
          pix_key: '00000000000',
          attachments: [{ path: 'receipts/x/y.txt', name: 'y.txt' }],
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
