import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/heroes';

interface HeroResponse {
  id: string;
  user_id: string;
  name: string;
  role: string;
  phrase: string;
  contributions: string[];
  start_year: number;
  end_year: number;
  photo_url: string;
  created_at: string;
  updated_at: string;
}

async function seedHero(suffix: string) {
  const candidate = await orchestrator.database.seed.createUser({
    username: `Hero ${suffix}`,
    email: `heroes.get.candidate.${suffix}.${Date.now()}@watt-test.com`,
    password: '',
    role: 'consultor',
    sector: 'comercial',
  });
  await orchestrator.database.seed.deactivateUser(candidate.id);
  const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
    candidate.id,
    'foto.jpg',
  );
  const hero = await orchestrator.database.seed.createHero({
    user_id: candidate.id,
    photo_path: photoPath,
  });
  return { candidate, hero };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── GET /heroes ───────────────────────────────────────────────────────────

describe('GET /heroes', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Listing all heroes', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor List Heroes',
        email: `heroes.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { hero, candidate } = await seedHero('consultor');

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      const body = (await response.json()) as HeroResponse[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((h) => h.id === hero.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe(candidate.name);
      expect(found?.role).toBe(candidate.role);
      expect(Array.isArray(found?.contributions)).toBe(true);
      expect(found?.photo_url).toEqual(expect.any(String));
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Listing all heroes', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente List Heroes',
        email: `heroes.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Listing all heroes', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Diretor List Heroes',
        email: `heroes.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Listing all heroes', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor List Heroes',
        email: `heroes.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Listing all heroes', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente List Heroes',
        email: `heroes.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Listing heroes without a token', async () => {
      const { hero, candidate } = await seedHero('unauthenticated');

      const response = await fetch(BASE_URL);
      const body = (await response.json()) as HeroResponse[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      const found = body.find((h) => h.id === hero.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe(candidate.name);
    });
  });
});

// ─── GET /heroes/:id ───────────────────────────────────────────────────────

describe('GET /heroes/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving an existing hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Get Hero',
        email: `heroes.getone.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { hero, candidate } = await seedHero('getone.consultor');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBe(hero.id);
      expect(body.name).toBe(candidate.name);
      expect(body.role).toBe(candidate.role);
      expect(body.photo_url).toEqual(expect.any(String));
    });

    test('Attempting to retrieve a non-existent hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Get Hero 404',
        email: `heroes.getone.consultor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { headers: { Authorization: `Bearer ${actor.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving an existing hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Get Hero',
        email: `heroes.getone.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const { hero } = await seedHero('getone.gerente');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving an existing hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Diretor Get Hero',
        email: `heroes.getone.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const { hero } = await seedHero('getone.diretor');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Retrieving an existing hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Get Hero',
        email: `heroes.getone.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { hero } = await seedHero('getone.assessor');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving an existing hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente Get Hero',
        email: `heroes.getone.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const { hero } = await seedHero('getone.presidente');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        headers: { Authorization: `Bearer ${actor.token}` },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Unauthenticated user', () => {
    test('Retrieving an existing hero without a token', async () => {
      const { hero, candidate } = await seedHero('getone.unauthenticated');

      const response = await fetch(`${BASE_URL}/${hero.id}`);
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBe(hero.id);
      expect(body.name).toBe(candidate.name);
    });

    test('Attempting to retrieve a non-existent hero without a token', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
      );
      expect(response.status).toBe(404);
    });
  });
});
