import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/notifications';

type NotificationBody = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  origin: string;
};

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('GET /notifications', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Retrieving own notifications', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor GET Notifs',
        email: `notifs.get.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: consultor.id,
        title: 'Notificação consultor',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((n) => expect(n.user_id).toBe(consultor.id));
      expect(body.some((n) => n.id === notif.id)).toBe(true);
    });

    test('Retrieving notifications when has no notifications', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor No Notifs',
        email: `notifs.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test("Trying to retrieve another user's notifications", async () => {
      const consultorA = await orchestrator.database.seed.createUser({
        username: 'Consultor A Notifs',
        email: `notifs.get.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const consultorB = await orchestrator.database.seed.createUser({
        username: 'Consultor B Notifs',
        email: `notifs.get.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const notifB = await orchestrator.database.seed.createNotification({
        user_id: consultorB.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultorA.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(body.some((n) => n.id === notifB.id)).toBe(false);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Retrieving own notifications', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente GET Notifs',
        email: `notifs.get.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: gerente.id,
        title: 'Notificação gerente',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((n) => expect(n.user_id).toBe(gerente.id));
      expect(body.some((n) => n.id === notif.id)).toBe(true);
    });

    test('Retrieving notifications when has no notifications', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente No Notifs',
        email: `notifs.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test("Trying to retrieve another user's notifications", async () => {
      const gerenteA = await orchestrator.database.seed.createUser({
        username: 'gerente A Notifs',
        email: `notifs.get.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const gerenteB = await orchestrator.database.seed.createUser({
        username: 'gerente B Notifs',
        email: `notifs.get.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const notifB = await orchestrator.database.seed.createNotification({
        user_id: gerenteB.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerenteA.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(body.some((n) => n.id === notifB.id)).toBe(false);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Retrieving own notifications', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor GET Notifs',
        email: `notifs.get.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: diretor.id,
        title: 'Notificação diretor',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((n) => expect(n.user_id).toBe(diretor.id));
      expect(body.some((n) => n.id === notif.id)).toBe(true);
    });

    test('Retrieving notifications when has no notifications', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor No Notifs',
        email: `notifs.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test("Trying to retrieve another user's notifications", async () => {
      const diretorA = await orchestrator.database.seed.createUser({
        username: 'diretor A Notifs',
        email: `notifs.get.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const diretorB = await orchestrator.database.seed.createUser({
        username: 'diretor B Notifs',
        email: `notifs.get.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const notifB = await orchestrator.database.seed.createNotification({
        user_id: diretorB.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretorA.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(body.some((n) => n.id === notifB.id)).toBe(false);
    });
  });

  describe('Authenticated assessor', () => {
    test('Retrieving own notifications', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor GET Notifs',
        email: `notifs.get.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: assessor.id,
        title: 'Notificação assessor',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((n) => expect(n.user_id).toBe(assessor.id));
      expect(body.some((n) => n.id === notif.id)).toBe(true);
    });

    test('Retrieving notifications when has no notifications', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor No Notifs',
        email: `notifs.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test("Trying to retrieve another user's notifications", async () => {
      const assessorA = await orchestrator.database.seed.createUser({
        username: 'assessor A Notifs',
        email: `notifs.get.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const assessorB = await orchestrator.database.seed.createUser({
        username: 'assessor B Notifs',
        email: `notifs.get.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const notifB = await orchestrator.database.seed.createNotification({
        user_id: assessorB.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessorA.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(body.some((n) => n.id === notifB.id)).toBe(false);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Retrieving own notifications', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente GET Notifs',
        email: `notifs.get.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: presidente.id,
        title: 'Notificação presidente',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      body.forEach((n) => expect(n.user_id).toBe(presidente.id));
      expect(body.some((n) => n.id === notif.id)).toBe(true);
    });

    test('Retrieving notifications when has no notifications', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente No Notifs',
        email: `notifs.get.empty.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test("Trying to retrieve another user's notifications", async () => {
      const presidenteA = await orchestrator.database.seed.createUser({
        username: 'presidente A Notifs',
        email: `notifs.get.a.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const presidenteB = await orchestrator.database.seed.createUser({
        username: 'presidente B Notifs',
        email: `notifs.get.b.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const notifB = await orchestrator.database.seed.createNotification({
        user_id: presidenteB.id,
      });

      const response = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidenteA.token}` },
      });
      const body = (await response.json()) as NotificationBody[];

      expect(response.status).toBe(200);
      expect(body.some((n) => n.id === notifB.id)).toBe(false);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to retrieve notifications', async () => {
      const response = await fetch(BASE_URL);
      expect(response.status).toBe(401);
    });
  });
});
