import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActivitiesService } from './activities.service';
import { DatabaseService } from '../../database/database.service';

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'act-uuid-1',
  user_id: 'user-uuid-1',
  user_name: 'João Silva',
  name: 'Reunião',
  description: null,
  date: new Date('2026-05-29'),
  time_start: '09:00',
  time_end: '10:00',
  priority: 'alta' as const,
  created_at: new Date('2026-05-29T08:00:00Z'),
  updated_at: new Date('2026-05-29T08:00:00Z'),
  ...overrides,
});

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: DatabaseService,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ActivitiesService);
    db = module.get(DatabaseService);
  });

  describe('create', () => {
    it('should create an activity and return ActivityResponse', async () => {
      const row = makeRow();
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

      const result = await service.create('user-uuid-1', {
        name: 'Reunião',
        date: '2026-05-29',
        time_start: '09:00',
        time_end: '10:00',
        priority: 'alta',
      });

      expect(result.id).toBe('act-uuid-1');
      expect(result.user_id).toBe('user-uuid-1');
      expect(typeof result.date).toBe('string');
      expect(typeof result.created_at).toBe('string');
    });
  });

  describe('findAll', () => {
    it('should return activities visible to the requester', async () => {
      const row = makeRow();
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

      const result = await service.findAll('user-uuid-1', 0, ['projetos'], {});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('act-uuid-1');
    });

    it('should return empty array when no activities visible', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.findAll('user-uuid-1', 0, ['projetos'], {});

      expect(result).toHaveLength(0);
    });

    it('should pass date filter when provided', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll('user-uuid-1', 1, ['projetos'], {
        date: '2026-05-29',
      });

      const [sql] = (db.query as jest.MockedFunction<typeof db.query>).mock
        .calls[0] as [string, ...unknown[]];
      expect(sql).toContain('date =');
    });

    it('should pass from/to filters when provided', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll('user-uuid-1', 1, ['projetos'], {
        from: '2026-05-01',
        to: '2026-05-31',
      });

      const [sql] = (db.query as jest.MockedFunction<typeof db.query>).mock
        .calls[0] as [string, ...unknown[]];
      expect(sql).toContain('>=');
      expect(sql).toContain('<=');
    });

    it('date filter should override from/to', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll('user-uuid-1', 1, ['projetos'], {
        date: '2026-05-15',
        from: '2026-05-01',
        to: '2026-05-31',
      });

      const [sql] = (db.query as jest.MockedFunction<typeof db.query>).mock
        .calls[0] as [string, ...unknown[]];
      expect(sql).toContain('date =');
      expect(sql).not.toMatch(/date >=|a\.date >=/);
    });

    it('should filter by userId when provided', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll('user-uuid-1', 1, ['projetos'], {
        userId: 'other-user-uuid',
      });

      const [sql, ...params] = (
        db.query as jest.MockedFunction<typeof db.query>
      ).mock.calls[0] as [string, ...unknown[]];
      expect(sql).toContain('a.user_id =');
      expect(params.flat()).toContain('other-user-uuid');
    });

    it('should return only own activities when userId equals requesterId', async () => {
      const ownRow = makeRow({ user_id: 'user-uuid-1' });
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [ownRow],
        rowCount: 1,
      });

      const result = await service.findAll('user-uuid-1', 0, ['projetos'], {
        userId: 'user-uuid-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('user-uuid-1');
    });
  });

  describe('update', () => {
    it('should update the activity when requester is the owner', async () => {
      const updated = makeRow({ name: 'Reunião atualizada' });
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeRow()], rowCount: 1 }) // find
        .mockResolvedValueOnce({ rows: [updated], rowCount: 1 }); // update

      const result = await service.update('act-uuid-1', 'user-uuid-1', {
        name: 'Reunião atualizada',
      });

      expect(result.name).toBe('Reunião atualizada');
    });

    it('should throw ForbiddenException when requester is not the owner', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeRow({ user_id: 'other-user' })],
        rowCount: 1,
      });

      await expect(
        service.update('act-uuid-1', 'user-uuid-1', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when activity does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.update('nonexistent-id', 'user-uuid-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete the activity when requester is the owner', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [makeRow()], rowCount: 1 }) // find
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // delete

      await expect(
        service.remove('act-uuid-1', 'user-uuid-1'),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when requester is not the owner', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeRow({ user_id: 'other-user' })],
        rowCount: 1,
      });

      await expect(service.remove('act-uuid-1', 'user-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when activity does not exist', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.remove('nonexistent-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
