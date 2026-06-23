import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/push-subscriptions';

const validPayload = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtwe6YNE5vIVrDML',
  auth: 'tBHItJI5svbpez7KI4CCXg',
};

type PushSubscriptionCreatedResponse = {
  id: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /push-subscriptions ─────────────────────────────────────────────────

describe('POST /push-subscriptions', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Registering a push subscription with valid data returns 201 and the subscription id', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Register Push',
        email: `push.post.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          endpoint: `https://fcm.googleapis.com/fcm/send/consultor-${Date.now()}`,
        }),
      });
      const body = (await response.json()) as PushSubscriptionCreatedResponse;

      expect(response.status).toBe(201);
      expect(body.id).toBeDefined();
    });

    test('Attempting to register without endpoint returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Register Push Bad Input',
        email: `push.post.consultor.bad.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          p256dh: validPayload.p256dh,
          auth: validPayload.auth,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to register without p256dh returns 400', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Register Push No P256dh',
        email: `push.post.consultor.no-p256dh.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          endpoint: validPayload.endpoint,
          auth: validPayload.auth,
        }),
      });

      expect(response.status).toBe(400);
    });

    test('Attempting to register a duplicate active endpoint returns 409', async () => {
      const ts = Date.now();
      const user = await orchestrator.database.seed.createUser({
        username: 'Consultor Register Push Duplicate',
        email: `push.post.consultor.dup.${ts}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const endpoint = `https://fcm.googleapis.com/fcm/send/dup-${ts}`;

      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, endpoint }),
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ ...validPayload, endpoint }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Registering a push subscription returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Gerente Register Push',
        email: `push.post.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          endpoint: `https://fcm.googleapis.com/fcm/send/gerente-${Date.now()}`,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Registering a push subscription returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Diretor Register Push',
        email: `push.post.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          endpoint: `https://fcm.googleapis.com/fcm/send/diretor-${Date.now()}`,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Registering a push subscription returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Assessor Register Push',
        email: `push.post.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'institucional',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          endpoint: `https://fcm.googleapis.com/fcm/send/assessor-${Date.now()}`,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Registering a push subscription returns 201', async () => {
      const user = await orchestrator.database.seed.createUser({
        username: 'Presidente Register Push',
        email: `push.post.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'executivo',
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          ...validPayload,
          endpoint: `https://fcm.googleapis.com/fcm/send/presidente-${Date.now()}`,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to register a push subscription without a token returns 401', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
    });
  });
});
