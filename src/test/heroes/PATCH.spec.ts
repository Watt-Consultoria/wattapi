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
    email: `heroes.patch.candidate.${suffix}.${Date.now()}@watt-test.com`,
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
    start_year: 2020,
    end_year: 2023,
  });
  return { candidate, hero, photoPath };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── PATCH /heroes/:id ─────────────────────────────────────────────────────

describe('PATCH /heroes/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to update a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Update Hero',
        email: `heroes.patch.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const { hero } = await seedHero('consultor');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ phrase: 'Nova frase' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to update a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Update Hero',
        email: `heroes.patch.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const { hero } = await seedHero('gerente');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ phrase: 'Nova frase' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to update a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Diretor Update Hero',
        email: `heroes.patch.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const { hero } = await seedHero('diretor');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ phrase: 'Nova frase' }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Updating a hero partially', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Hero',
        email: `heroes.patch.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { hero } = await seedHero('assessor.ok');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ phrase: 'Frase atualizada' }),
      });
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(200);
      expect(body.id).toBe(hero.id);
      expect(body.phrase).toBe('Frase atualizada');
    });

    test('Attempting to update a hero with an empty body', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Hero Empty Body',
        email: `heroes.patch.assessor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { hero } = await seedHero('assessor.empty');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a non-existent hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Hero 404',
        email: `heroes.patch.assessor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${actor.token}`,
          },
          body: JSON.stringify({ phrase: 'Frase atualizada' }),
        },
      );
      expect(response.status).toBe(404);
    });

    test('Attempting to update a hero with a photo_path missing from storage', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Hero Missing Photo',
        email: `heroes.patch.assessor.missingphoto.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { hero, candidate } = await seedHero('assessor.missingphoto');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          photo_path: `heroes/${candidate.id}/nao-existe.jpg`,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to update a hero resulting in start_year after end_year', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Update Hero Bad Years',
        email: `heroes.patch.assessor.years.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const { hero } = await seedHero('assessor.years');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ start_year: 2024 }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Updating a hero partially', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente Update Hero',
        email: `heroes.patch.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const { hero } = await seedHero('presidente');

      const response = await fetch(`${BASE_URL}/${hero.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({ contributions: ['Nova contribuição'] }),
      });
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(200);
      expect(body.contributions).toEqual(['Nova contribuição']);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to update a hero without a token', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase: 'Frase atualizada' }),
        },
      );
      expect(response.status).toBe(401);
    });
  });
});
