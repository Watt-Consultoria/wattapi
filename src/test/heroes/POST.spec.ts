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

async function seedInactiveHeroCandidate(suffix: string) {
  const user = await orchestrator.database.seed.createUser({
    username: `Hero Candidate ${suffix}`,
    email: `heroes.post.candidate.${suffix}.${Date.now()}@watt-test.com`,
    password: '',
    role: 'consultor',
    sector: 'comercial',
  });
  await orchestrator.database.seed.deactivateUser(user.id);
  return user;
}

function validBody(userId: string, photoPath: string) {
  return {
    user_id: userId,
    phrase: 'Fez a diferença em tudo que tocou.',
    contributions: ['Liderou o projeto X', 'Mentorou 5 consultores'],
    start_year: 2020,
    end_year: 2023,
    photo_path: photoPath,
  };
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /heroes ──────────────────────────────────────────────────────────

describe('POST /heroes', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Attempting to create a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Consultor Create Hero',
        email: `heroes.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const candidate = await seedInactiveHeroCandidate('consultor');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Attempting to create a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Gerente Create Hero',
        email: `heroes.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const candidate = await seedInactiveHeroCandidate('gerente');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Attempting to create a hero as a non-superuser', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Diretor Create Hero',
        email: `heroes.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });
      const candidate = await seedInactiveHeroCandidate('diretor');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a hero from a valid inactive user', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero',
        email: `heroes.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate('assessor.ok');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(candidate.id);
      expect(body.name).toBe(candidate.name);
      expect(body.role).toBe(candidate.role);
      expect(Array.isArray(body.contributions)).toBe(true);
      expect(body.contributions).toEqual([
        'Liderou o projeto X',
        'Mentorou 5 consultores',
      ]);
      expect(body.photo_url).toEqual(expect.any(String));
      expect(body.photo_url).toContain('token=');
      expect(body).not.toHaveProperty('photo_path');
    });

    test('Attempting to create a hero with a missing required field', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Missing Field',
        email: `heroes.post.assessor.missing.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate('assessor.missing');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const { phrase: _phrase, ...bodyWithoutPhrase } = validBody(
        candidate.id,
        photoPath,
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(bodyWithoutPhrase),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a hero with an empty contributions list', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Empty Contributions',
        email: `heroes.post.assessor.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate('assessor.empty');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          ...validBody(candidate.id, photoPath),
          contributions: [],
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a hero with start_year after end_year', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Bad Years',
        email: `heroes.post.assessor.years.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate('assessor.years');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify({
          ...validBody(candidate.id, photoPath),
          start_year: 2023,
          end_year: 2020,
        }),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a hero for a user_id that does not exist', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero 404',
        email: `heroes.post.assessor.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        actor.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(
          validBody('00000000-0000-0000-0000-000000000001', photoPath),
        ),
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to create a hero for a user_id referencing an active user', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Active User',
        email: `heroes.post.assessor.active.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const activeCandidate = await orchestrator.database.seed.createUser({
        username: 'Active Candidate',
        email: `heroes.post.active.candidate.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        activeCandidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(activeCandidate.id, photoPath)),
      });
      expect(response.status).toBe(400);
    });

    test('Attempting to create a hero for a user_id that already has a hero', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Duplicate',
        email: `heroes.post.assessor.duplicate.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate('assessor.duplicate');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const firstResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      expect(firstResponse.status).toBe(201);

      const secondResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      expect(secondResponse.status).toBe(409);
    });

    test('Attempting to create a hero with a photo_path missing from storage', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Assessor Create Hero Missing Photo',
        email: `heroes.post.assessor.missingphoto.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      const candidate = await seedInactiveHeroCandidate(
        'assessor.missingphoto',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(
          validBody(candidate.id, `heroes/${candidate.id}/nao-existe.jpg`),
        ),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a hero from a valid inactive user', async () => {
      const actor = await orchestrator.database.seed.createUser({
        username: 'Presidente Create Hero',
        email: `heroes.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });
      const candidate = await seedInactiveHeroCandidate('presidente');
      const photoPath = await orchestrator.database.seed.uploadHeroPhoto(
        candidate.id,
        'foto.jpg',
      );

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${actor.token}`,
        },
        body: JSON.stringify(validBody(candidate.id, photoPath)),
      });
      const body = (await response.json()) as HeroResponse;

      expect(response.status).toBe(201);
      expect(body.user_id).toBe(candidate.id);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a hero without a token', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          validBody(
            '00000000-0000-0000-0000-000000000001',
            'heroes/x/foto.jpg',
          ),
        ),
      });
      expect(response.status).toBe(401);
    });
  });
});
