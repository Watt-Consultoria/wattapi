import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/notifications';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('POST /notifications', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Trying to create a notification', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor POST Notif',
        email: `notifs.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consultor.token}`,
        },
        body: JSON.stringify({ title: 'Aviso', target: {} }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Trying to create a notification', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente POST Notif',
        email: `notifs.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gerente.token}`,
        },
        body: JSON.stringify({ title: 'Aviso', target: {} }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Trying to create a notification', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor POST Notif',
        email: `notifs.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diretor.token}`,
        },
        body: JSON.stringify({ title: 'Aviso', target: {} }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Creating a notification targeting all users', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Notif',
        email: `notifs.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createUser({
        username: 'Recipient User',
        email: `notifs.post.recipient.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ title: 'Aviso geral', target: {} }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThan(0);
    });

    test('Creating a notification for a specific sector', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST Sector',
        email: `notifs.post.assessor.sector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createUser({
        username: 'Comercial User',
        email: `notifs.post.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({
          title: 'Aviso comercial',
          target: { sector: 'comercial' },
        }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(body.count).toBeGreaterThanOrEqual(1);
    });

    test('Creating a notification with no matching recipients', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST NoMatch',
        email: `notifs.post.nomatch.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({
          title: 'Aviso',
          target: { sector: 'setor-inexistente-xyz' },
        }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(body.count).toBe(0);
    });

    test('Trying to create a notification without a title', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'Assessor POST No Title',
        email: `notifs.post.notitle.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${assessor.token}`,
        },
        body: JSON.stringify({ target: {} }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Creating a notification targeting all users', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente POST Notif',
        email: `notifs.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createUser({
        username: 'Recipient User',
        email: `notifs.post.recipient.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ title: 'Aviso geral', target: {} }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThan(0);
    });

    test('Creating a notification for a specific sector', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente POST Sector',
        email: `notifs.post.presidente.sector.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });
      await orchestrator.database.seed.createUser({
        username: 'Comercial User',
        email: `notifs.post.comercial.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({
          title: 'Aviso comercial',
          target: { sector: 'comercial' },
        }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(body.count).toBeGreaterThanOrEqual(1);
    });

    test('Creating a notification with no matching recipients', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente POST NoMatch',
        email: `notifs.post.nomatch.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({
          title: 'Aviso',
          target: { sector: 'setor-inexistente-xyz' },
        }),
      });
      const body = (await response.json()) as { count: number };

      expect(response.status).toBe(201);
      expect(body.count).toBe(0);
    });

    test('Trying to create a notification without a title', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente POST No Title',
        email: `notifs.post.notitle.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${presidente.token}`,
        },
        body: JSON.stringify({ target: {} }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to create a notification', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Aviso', target: {} }),
      });
      expect(response.status).toBe(401);
    });
  });
});
