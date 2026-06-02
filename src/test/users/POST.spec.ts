import * as jwt from 'jsonwebtoken';
import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/users';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

type UserBody = {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  created_at: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /users', () => {
  describe('Authenticated new user', () => {
    test('Creating a profile with valid body', async () => {
      const authUser = await orchestrator.database.seed.createAuthOnlyUser(
        `users.post.new.${Date.now()}@watt-test.com`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          name: 'Novo Usuário',
          sector: 'projetos',
          cpf: '00011122233',
        }),
      });
      const body = (await response.json()) as UserBody;

      expect(response.status).toBe(201);
      expect(body.id).toBe(authUser.id);
      expect(body.email).toBe(authUser.email);
      expect(body.role).toBe('consultor');
      expect(body.sector).toBe('projetos');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');
    });

    test('Attempting to create a profile with missing required field', async () => {
      const authUser = await orchestrator.database.seed.createAuthOnlyUser(
        `users.post.missingfield.${Date.now()}@watt-test.com`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({ sector: 'projetos', cpf: '11122200099' }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a profile with invalid sector', async () => {
      const authUser = await orchestrator.database.seed.createAuthOnlyUser(
        `users.post.badsector.${Date.now()}@watt-test.com`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          name: 'Setor Inválido',
          sector: 'invalido',
          cpf: '11122200099',
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Trying to create a profile with a CPF already in use', async () => {
      const existing = await orchestrator.database.seed.createUser({
        username: 'CPF Owner',
        email: `users.post.cpfowner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const newAuthUser = await orchestrator.database.seed.createAuthOnlyUser(
        `users.post.cpfdup.${Date.now()}@watt-test.com`,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newAuthUser.token}`,
        },
        body: JSON.stringify({
          name: 'CPF Duplicado',
          sector: 'comercial',
          cpf: existing.cpf,
        }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Already registered user', () => {
    test('Trying to create a profile when one already exists', async () => {
      const existingUser = await orchestrator.database.seed.createUser({
        username: 'Existing User',
        email: `users.post.existing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${existingUser.token}`,
        },
        body: JSON.stringify({
          name: 'Qualquer',
          sector: 'projetos',
          cpf: '99988877766',
        }),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('Unauthenticated user', () => {
    test('Trying to create a profile1', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sem Token',
          sector: 'comercial',
          cpf: '11122233300',
        }),
      });
      expect(response.status).toBe(401);
    });

    test('Token sub is not a valid UUID returns 401', async () => {
      const token = jwt.sign({ sub: 'not-a-uuid' }, JWT_SECRET);

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Qualquer',
          sector: 'projetos',
          cpf: '44455566677',
        }),
      });
      expect(response.status).toBe(401);
    });
  });
});
