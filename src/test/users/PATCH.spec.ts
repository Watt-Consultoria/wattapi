import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/users';

type UserBody = {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf?: string;
  updated_at: string;
  created_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('PATCH /users/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Editing own data', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor Self Edit',
        email: `users.patch.consultor.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${consultor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ name: 'consultor Auto-edit' }),
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to edit another user', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor Forbidden',
        email: `users.patch.consultor.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other User',
        email: `users.patch.consultor.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own role', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor Role Attempt',
        email: `users.patch.consultor.role.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${consultor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ role: 'diretor' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own sector', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor Sector Attempt',
        email: `users.patch.consultor.sector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${consultor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ sector: 'executivo' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Editing own data', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Self Edit',
        email: `users.patch.gerente.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${gerente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ name: 'Gerente Auto-edit' }),
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to edit another user', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Forbidden',
        email: `users.patch.gerente.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other User',
        email: `users.patch.gerente.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own role', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Role Attempt',
        email: `users.patch.gerente.role.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${gerente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ role: 'diretor' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own sector', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente Sector Attempt',
        email: `users.patch.gerente.sector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${gerente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ sector: 'executivo' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Editing own data', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Self Edit',
        email: `users.patch.diretor.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ name: 'diretor Auto-edit' }),
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to edit another user', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Forbidden',
        email: `users.patch.diretor.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const other = await orchestrator.database.seed.createUser({
        username: 'Other User',
        email: `users.patch.diretor.other.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${other.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own role', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Role Attempt',
        email: `users.patch.diretor.role.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ role: 'diretor' }),
      });
      expect(response.status).toBe(403);
    });

    test('Attempting to edit own sector', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor Sector Attempt',
        email: `users.patch.diretor.sector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${diretor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ sector: 'executivo' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Attempting to edit a user with lower rank', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor PATCH',
        email: `users.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Lower',
        email: `users.patch.assessor.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'Assessor Updated' }),
      });
      expect(response.status).toBe(200);
    });

    test('Attempting to edit a user with equal or higher rank', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor Forbidden',
        email: `users.patch.assessor.forbidden.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Target',
        email: `users.patch.assessor.pres.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(`${BASE_URL}/${presidente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'Tentativa' }),
      });
      expect(response.status).toBe(403);
    });

    test('Editing own data', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor Self Edit',
        email: `users.patch.assessor.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${assessor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ name: 'assessor Auto-edit' }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Editing another user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente PATCH',
        email: `users.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target PATCH',
        email: `users.patch.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ name: 'Nome Atualizado' }),
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(target.id);
      expect(body.name).toBe('Nome Atualizado');
      expect(body.email).toBe(target.email);
      expect(body.role).toBe(target.role);
      expect(body.sector).toBe(target.sector);
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');

      expect(response.status).toBe(200);
      expect(body.name).toBe('Nome Atualizado');
      expect(body.email).toBe(target.email);
      expect(body.role).toBe(target.role);
      expect(body.sector).toBe(target.sector);
    });

    test('Attempting to edit a non-existent user', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente 404',
        email: `users.patch.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${presidente.token}`,
          },
          body: JSON.stringify({ name: 'Ghost' }),
        },
      );
      expect(response.status).toBe(404);
    });

    test('Attempting to edit a user with an invalid body', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Empty',
        email: `users.patch.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'Target Empty',
        email: `users.patch.empty.target.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const emptyBody = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({}),
      });

      const invalidEmail = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ email: 'invalid-email' }),
      });

      const invalidRole = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ role: 'invalid-role' }),
      });

      const invalidSector = await fetch(`${BASE_URL}/${target.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ sector: 'invalid-sector' }),
      });

      expect(emptyBody.status).toBe(400);
      expect(invalidEmail.status).toBe(400);
      expect(invalidRole.status).toBe(400);
      expect(invalidSector.status).toBe(400);
    });

    test('Attempting to edit a user with a duplicate email', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Dup Email',
        email: `users.patch.dupemail.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const userA = await orchestrator.database.seed.createUser({
        username: 'User A',
        email: `users.patch.usera.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const userB = await orchestrator.database.seed.createUser({
        username: 'User B',
        email: `users.patch.userb.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(`${BASE_URL}/${userA.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ email: userB.email }),
      });
      expect(response.status).toBe(409);
    });

    test('Editing own data', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente Self Edit',
        email: `users.patch.presidente.self.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'projetos',
      });

      const response = await fetch(`${BASE_URL}/${presidente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ name: 'presidente Auto-edit' }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a user', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Sem Token' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
