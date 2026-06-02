import * as jwt from 'jsonwebtoken';
import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/auth/me';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-super-secret-jwt-key-with-at-least-32-characters';

type AuthMeBody = {
  id: string;
  email: string;
  name: string;
  role: string;
  sector: string;
  cpf: string;
  created_at: string;
  updated_at: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /auth/me', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own profile', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Auth',
        email: `auth.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AuthMeBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email);
      expect(body.name).toBe(user.name);
      expect(body.role).toBe('consultor');
      expect(body.sector).toBe('comercial');
      expect(body.cpf).toBeDefined();
      expect(new Date(body.created_at).toISOString()).toBe(body.created_at);
      expect(new Date(body.updated_at).toISOString()).toBe(body.updated_at);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving own profile', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Auth',
        email: `auth.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AuthMeBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(user.id);
      expect(body.role).toBe('gerente');
      expect(body.cpf).toBeDefined();
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving own profile', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Auth',
        email: `auth.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AuthMeBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(user.id);
      expect(body.role).toBe('diretor');
      expect(body.cpf).toBeDefined();
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving own profile', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Auth',
        email: `auth.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AuthMeBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(user.id);
      expect(body.role).toBe('assessor');
      expect(body.cpf).toBeDefined();
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving own profile', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Auth',
        email: `auth.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const body = (await response.json()) as AuthMeBody;

      expect(response.status).toBe(200);
      expect(body.id).toBe(user.id);
      expect(body.role).toBe('presidente');
      expect(body.cpf).toBeDefined();
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve profile without Authorization header', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });

    test('Attempting to retrieve profile without Bearer prefix', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'No Bearer',
        email: `auth.nobearer.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: user.token },
      });
      expect(response.status).toBe(401);
    });

    test('Attempting to retrieve profile with an expired token', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Expired Token',
        email: `auth.expired.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const expiredToken = jwt.sign(
        { sub: user.id, exp: Math.floor(Date.now() / 1000) - 60 },
        JWT_SECRET,
      );

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(response.status).toBe(401);
    });

    test('Attempting to retrieve profile with a token signed with the wrong secret', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Wrong Secret',
        email: `auth.wrongsecret.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const badToken = jwt.sign(
        { sub: user.id },
        'wrong-secret-key-that-is-long-enough-to-pass',
      );

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${badToken}` },
      });
      expect(response.status).toBe(401);
    });

    test('Attempting to retrieve profile with a valid token but no matching user row', async () => {
      const token = jwt.sign(
        { sub: '00000000-0000-0000-0000-000000000001' },
        JWT_SECRET,
      );

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.status).toBe(401);
    });

    test('Attempting to retrieve profile after being deactivated', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'Presidente Deleter',
        email: `auth.pres.deleter.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const target = await orchestrator.database.seed.createUser({
        username: 'To Be Deleted',
        email: `auth.tobedeleted.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      await fetch(`http://localhost:3001/users/${target.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${target.token}` },
      });
      expect(response.status).toBe(401);
    });
  });
});
