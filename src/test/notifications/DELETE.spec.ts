import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/notifications';

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

describe('DELETE /notifications/:id', () => {
  describe('Authenticated CONSULTOR', () => {
    test('Deleting own notification', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE Notif',
        email: `notifs.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const notif = await orchestrator.database.seed.createNotification({
        user_id: consultor.id,
        title: 'Para deletar',
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const body = (await listResponse.json()) as { id: string }[];

      expect(response.status).toBe(204);
      expect(body.some((n) => n.id === notif.id)).toBe(false);
    });

    test('Attempting to delete an already-deleted notification', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE Again',
        email: `notifs.delete.again.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: consultor.id,
      });

      await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a non-existent notification', async () => {
      const consultor = await orchestrator.database.seed.createUser({
        username: 'Consultor DELETE 404',
        email: `notifs.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${consultor.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test("Trying to delete another user's notification", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Notif Owner',
        email: `notifs.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const consultor = await orchestrator.database.seed.createUser({
        username: 'consultor DELETE Forbidden',
        email: `notifs.delete.consultor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'projetos',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consultor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated GERENTE', () => {
    test('Deleting own notification', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente DELETE Notif',
        email: `notifs.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: gerente.id,
        title: 'Para deletar',
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const body = (await listResponse.json()) as { id: string }[];

      expect(response.status).toBe(204);
      expect(body.some((n) => n.id === notif.id)).toBe(false);
    });

    test('Attempting to delete an already-deleted notification', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente DELETE Again',
        email: `notifs.delete.again.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: gerente.id,
      });

      await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a non-existent notification', async () => {
      const gerente = await orchestrator.database.seed.createUser({
        username: 'gerente DELETE 404',
        email: `notifs.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${gerente.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test("Trying to delete another user's notification", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Notif Owner',
        email: `notifs.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'comercial',
      });
      const gerente = await orchestrator.database.seed.createUser({
        username: 'Gerente DELETE Forbidden',
        email: `notifs.delete.gerente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated DIRETOR', () => {
    test('Deleting own notification', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor DELETE Notif',
        email: `notifs.delete.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: diretor.id,
        title: 'Para deletar',
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const body = (await listResponse.json()) as { id: string }[];

      expect(response.status).toBe(204);
      expect(body.some((n) => n.id === notif.id)).toBe(false);
    });

    test('Attempting to delete an already-deleted notification', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor DELETE Again',
        email: `notifs.delete.again.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: diretor.id,
      });

      await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a non-existent notification', async () => {
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor DELETE 404',
        email: `notifs.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${diretor.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test("Trying to delete another user's notification", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Notif Owner',
        email: `notifs.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'comercial',
      });
      const diretor = await orchestrator.database.seed.createUser({
        username: 'diretor DELETE Forbidden',
        email: `notifs.delete.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${diretor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated ASSESSOR', () => {
    test('Deleting own notification', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor DELETE Notif',
        email: `notifs.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: assessor.id,
        title: 'Para deletar',
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const body = (await listResponse.json()) as { id: string }[];

      expect(response.status).toBe(204);
      expect(body.some((n) => n.id === notif.id)).toBe(false);
    });

    test('Attempting to delete an already-deleted notification', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor DELETE Again',
        email: `notifs.delete.again.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: assessor.id,
      });

      await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a non-existent notification', async () => {
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor DELETE 404',
        email: `notifs.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${assessor.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test("Trying to delete another user's notification", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Notif Owner',
        email: `notifs.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'comercial',
      });
      const assessor = await orchestrator.database.seed.createUser({
        username: 'assessor DELETE Forbidden',
        email: `notifs.delete.assessor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'assessor',
        sector: 'projetos',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${assessor.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Authenticated PRESIDENTE', () => {
    test('Deleting own notification', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente DELETE Notif',
        email: `notifs.delete.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: presidente.id,
        title: 'Para deletar',
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      const listResponse = await fetch(BASE_URL, {
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const body = (await listResponse.json()) as { id: string }[];

      expect(response.status).toBe(204);
      expect(body.some((n) => n.id === notif.id)).toBe(false);
    });

    test('Attempting to delete an already-deleted notification', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente DELETE Again',
        email: `notifs.delete.again.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: presidente.id,
      });

      await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(404);
    });

    test('Attempting to delete a non-existent notification', async () => {
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente DELETE 404',
        email: `notifs.delete.404.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });

      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${presidente.token}` },
        },
      );
      expect(response.status).toBe(404);
    });

    test("Trying to delete another user's notification", async () => {
      const owner = await orchestrator.database.seed.createUser({
        username: 'Notif Owner',
        email: `notifs.delete.owner.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'comercial',
      });
      const presidente = await orchestrator.database.seed.createUser({
        username: 'presidente DELETE Forbidden',
        email: `notifs.delete.presidente.${Date.now()}@watt-test.com`,
        password: '',
        role: 'presidente',
        sector: 'projetos',
      });
      const notif = await orchestrator.database.seed.createNotification({
        user_id: owner.id,
      });

      const response = await fetch(`${BASE_URL}/${notif.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${presidente.token}` },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('Unauthenticated user', () => {
    test('Attempting to delete a notification', async () => {
      const response = await fetch(
        `${BASE_URL}/00000000-0000-0000-0000-000000000001`,
        { method: 'DELETE' },
      );
      expect(response.status).toBe(401);
    });
  });
});
