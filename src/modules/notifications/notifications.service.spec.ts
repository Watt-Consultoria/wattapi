import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { DatabaseService } from '../../database/database.service';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-uuid-1',
  user_id: 'user-uuid-1',
  title: 'Atividade agendada para hoje: Reunião',
  description: null,
  origin: 'automatic' as const,
  sent_at: new Date('2026-05-30T03:00:00Z'),
  created_by: null,
  deleted_at: null,
  created_at: new Date('2026-05-30T03:00:00Z'),
  ...overrides,
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: DatabaseService,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
    db = module.get(DatabaseService);
  });

  describe('findAll', () => {
    it('should return notifications for the user', async () => {
      const row = makeRow();
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

      const result = await service.findAll('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-uuid-1');
      expect(typeof result[0].sent_at).toBe('string');
    });

    it('should return empty array when user has no notifications', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.findAll('user-uuid-1');

      expect(result).toHaveLength(0);
    });

    it('should query only non-deleted notifications', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll('user-uuid-1');

      const [sql] = (db.query as jest.MockedFunction<typeof db.query>).mock
        .calls[0] as [string, ...unknown[]];
      expect(sql).toContain('deleted_at IS NULL');
    });
  });

  describe('softDelete', () => {
    it('should set deleted_at when requester is the owner', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeRow()], rowCount: 1 }) // find
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // update

      await expect(
        service.softDelete('notif-uuid-1', 'user-uuid-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when requester is not the owner', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeRow({ user_id: 'other-user' })],
        rowCount: 1,
      });

      await expect(
        service.softDelete('notif-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.softDelete('nonexistent-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDirected', () => {
    it('should throw ForbiddenException when requester rank < 3', async () => {
      await expect(
        service.createDirected('user-uuid-1', 2, {
          title: 'Aviso',
          target: {},
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create notifications for all active users when target is empty', async () => {
      const users = [
        { id: 'user-uuid-1' },
        { id: 'user-uuid-2' },
        { id: 'user-uuid-3' },
      ];
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: users, rowCount: 3 }) // select recipients
        .mockResolvedValueOnce({ rows: [], rowCount: 3 }); // insert

      const result = await service.createDirected('user-uuid-1', 3, {
        title: 'Aviso geral',
        target: {},
      });

      expect(result.count).toBe(3);
    });

    it('should filter by sector when only sector is provided', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-uuid-2' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.createDirected('user-uuid-1', 3, {
        title: 'Aviso comercial',
        target: { sector: 'comercial' },
      });

      const [sql, params] = (db.query as jest.MockedFunction<typeof db.query>)
        .mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('sector');
      expect(params).toContain('comercial');
    });

    it('should filter by role when only role is provided', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-uuid-3' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.createDirected('user-uuid-1', 3, {
        title: 'Aviso diretores',
        target: { role: 'diretor' },
      });

      const [sql, params] = (db.query as jest.MockedFunction<typeof db.query>)
        .mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('role');
      expect(params).toContain('diretor');
    });

    it('should filter by sector AND role when both are provided', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-uuid-4' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.createDirected('user-uuid-1', 4, {
        title: 'Aviso diretor comercial',
        target: { sector: 'comercial', role: 'diretor' },
      });

      const [sql, params] = (db.query as jest.MockedFunction<typeof db.query>)
        .mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('sector');
      expect(sql).toContain('role');
      expect(params).toContain('comercial');
      expect(params).toContain('diretor');
    });

    it('should return count 0 when no recipients match the target', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.createDirected('user-uuid-1', 3, {
        title: 'Aviso vazio',
        target: { sector: 'inexistente' },
      });

      expect(result.count).toBe(0);
    });
  });
});
