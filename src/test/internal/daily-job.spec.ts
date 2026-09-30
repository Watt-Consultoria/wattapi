import orchestrator from '../orchestrator';

const BASE_URL = 'http://localhost:3001/internal/daily-job';
const NOTIFICATIONS_URL = 'http://localhost:3001/notifications';

const INTERNAL_SECRET = process.env.INTERNAL_JOB_SECRET ?? '';

interface DailyJobResponse {
  notifications_created: number;
  almoxarifado_overdue_notifications_created: number;
}

interface NotificationResponse {
  id: string;
  title: string;
  description: string | null;
}

function pastDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function futureDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function getOwnNotifications(
  token: string,
): Promise<NotificationResponse[]> {
  const response = await fetch(NOTIFICATIONS_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as NotificationResponse[];
}

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.database.clear();
});

// ─── POST /internal/daily-job ──────────────────────────────────────────────

describe('POST /internal/daily-job', () => {
  describe('Unauthenticated / invalid secret', () => {
    test('Rejecting a request without X-Internal-Secret', async () => {
      const response = await fetch(BASE_URL, { method: 'POST' });
      expect(response.status).toBe(401);
    });

    test('Rejecting a request with an invalid X-Internal-Secret', async () => {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': 'wrong-secret' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Almoxarifado overdue loan notifications', () => {
    test('Notifies the borrower and project managers for overdue loans, skips others, and rejects a second run the same day', async () => {
      const gerenteProjetos1 = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos 1',
        email: `daily-job.gerente1.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const gerenteProjetos2 = await orchestrator.database.seed.createUser({
        username: 'Gerente Projetos 2',
        email: `daily-job.gerente2.${Date.now()}@watt-test.com`,
        password: '',
        role: 'gerente',
        sector: 'projetos',
      });
      const diretorProjetos = await orchestrator.database.seed.createUser({
        username: 'Diretor Projetos',
        email: `daily-job.diretor.${Date.now()}@watt-test.com`,
        password: '',
        role: 'diretor',
        sector: 'projetos',
      });

      const borrowerOverdue = await orchestrator.database.seed.createUser({
        username: 'Borrower Overdue',
        email: `daily-job.borrower.overdue.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });
      const borrowerAlreadyNotified =
        await orchestrator.database.seed.createUser({
          username: 'Borrower Already Notified',
          email: `daily-job.borrower.notified.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        });
      const borrowerWithinDeadline =
        await orchestrator.database.seed.createUser({
          username: 'Borrower Within Deadline',
          email: `daily-job.borrower.future.${Date.now()}@watt-test.com`,
          password: '',
          role: 'consultor',
          sector: 'comercial',
        });
      const borrowerReturned = await orchestrator.database.seed.createUser({
        username: 'Borrower Returned',
        email: `daily-job.borrower.returned.${Date.now()}@watt-test.com`,
        password: '',
        role: 'consultor',
        sector: 'comercial',
      });

      const materialOverdue =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Furadeira Atrasada',
        });
      const materialAlreadyNotified =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Serra Já Notificada',
        });
      const materialWithinDeadline =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Parafusadeira No Prazo',
        });
      const materialReturned =
        await orchestrator.database.seed.createAlmoxarifadoMaterial({
          nome: 'Nível Devolvido',
        });

      await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
        material_id: materialOverdue.id,
        user_id: borrowerOverdue.id,
        previsao_devolucao: pastDate(2),
      });
      await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
        material_id: materialAlreadyNotified.id,
        user_id: borrowerAlreadyNotified.id,
        previsao_devolucao: pastDate(5),
        atraso_notificado_em: pastDate(1),
      });
      await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
        material_id: materialWithinDeadline.id,
        user_id: borrowerWithinDeadline.id,
        previsao_devolucao: futureDate(3),
      });
      await orchestrator.database.seed.createAlmoxarifadoEmprestimo({
        material_id: materialReturned.id,
        user_id: borrowerReturned.id,
        previsao_devolucao: pastDate(2),
        devolvido_em: pastDate(1),
      });

      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      const body = (await response.json()) as DailyJobResponse;

      expect(response.status).toBe(200);
      // 1 notification to the overdue borrower + 2 to the project managers
      expect(body.almoxarifado_overdue_notifications_created).toBe(3);

      const borrowerOverdueNotifications = await getOwnNotifications(
        borrowerOverdue.token,
      );
      expect(
        borrowerOverdueNotifications.some((n) =>
          n.title.includes('Furadeira Atrasada'),
        ),
      ).toBe(true);

      const borrowerAlreadyNotifiedNotifications = await getOwnNotifications(
        borrowerAlreadyNotified.token,
      );
      expect(borrowerAlreadyNotifiedNotifications).toHaveLength(0);

      const borrowerWithinDeadlineNotifications = await getOwnNotifications(
        borrowerWithinDeadline.token,
      );
      expect(borrowerWithinDeadlineNotifications).toHaveLength(0);

      const borrowerReturnedNotifications = await getOwnNotifications(
        borrowerReturned.token,
      );
      expect(borrowerReturnedNotifications).toHaveLength(0);

      const gerente1Notifications = await getOwnNotifications(
        gerenteProjetos1.token,
      );
      expect(
        gerente1Notifications.some(
          (n) =>
            n.title.includes('Furadeira Atrasada') &&
            n.title.includes(borrowerOverdue.name),
        ),
      ).toBe(true);

      const gerente2Notifications = await getOwnNotifications(
        gerenteProjetos2.token,
      );
      expect(
        gerente2Notifications.some((n) =>
          n.title.includes('Furadeira Atrasada'),
        ),
      ).toBe(true);

      const diretorNotifications = await getOwnNotifications(
        diretorProjetos.token,
      );
      expect(diretorNotifications).toHaveLength(0);

      const secondResponse = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'X-Internal-Secret': INTERNAL_SECRET },
      });
      expect(secondResponse.status).toBe(409);
    });
  });
});
