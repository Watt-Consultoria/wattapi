import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TimeTrackingService } from './time-tracking.service';
import { DatabaseService } from '../../database/database.service';

const makeEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'entry-uuid-1',
  user_id: 'user-uuid-1',
  clocked_in_at: new Date('2026-05-25T09:00:00Z'),
  clocked_out_at: null,
  is_valid: null,
  annulled_reason: null,
  ...overrides,
});

describe('TimeTrackingService', () => {
  let service: TimeTrackingService;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TimeTrackingService,
        {
          provide: DatabaseService,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TimeTrackingService);
    db = module.get(DatabaseService);
  });

  describe('clockIn', () => {
    it('should create a new entry when no open session exists', async () => {
      const entry = makeEntry();
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // check open session
        .mockResolvedValueOnce({ rows: [entry], rowCount: 1 }); // insert

      const result = await service.clockIn('user-uuid-1');

      expect(result.id).toBe('entry-uuid-1');
      expect(typeof result.clocked_in_at).toBe('string');
    });

    it('should throw ConflictException when an open session exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeEntry()],
        rowCount: 1,
      });

      await expect(service.clockIn('user-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('clockOut', () => {
    it('should return status valid when duration is within 8 hours', async () => {
      const clockedIn = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4h ago
      const clockedOut = new Date();
      const entry = makeEntry({
        clocked_in_at: clockedIn,
        clocked_out_at: clockedOut,
        is_valid: true,
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [makeEntry({ clocked_in_at: clockedIn })],
          rowCount: 1,
        }) // find open
        .mockResolvedValueOnce({ rows: [entry], rowCount: 1 }); // update

      const result = await service.clockOut('user-uuid-1');

      expect(result.status).toBe('valid');
      expect(result.id).toBe('entry-uuid-1');
      expect(
        (result as { duration_minutes: number }).duration_minutes,
      ).toBeGreaterThan(0);
    });

    it('should return status annulled when duration exceeds 8 hours', async () => {
      const clockedIn = new Date(Date.now() - 9 * 60 * 60 * 1000); // 9h ago
      const clockedOut = new Date();
      const entry = makeEntry({
        clocked_in_at: clockedIn,
        clocked_out_at: clockedOut,
        is_valid: false,
        annulled_reason: 'exceeded_max_duration',
      });

      (db.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [makeEntry({ clocked_in_at: clockedIn })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [entry], rowCount: 1 });

      const result = await service.clockOut('user-uuid-1');

      expect(result.status).toBe('annulled');
      if (result.status === 'annulled') {
        expect(result.reason).toBe('exceeded_max_duration');
      }
    });

    it('should throw ConflictException when no open session exists', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(service.clockOut('user-uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getSummary', () => {
    it('should return current_session none when no open session', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // valid sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // open session

      const result = await service.getSummary('user-1', 'consultor', 'user-1');

      expect(result.current_session.status).toBe('none');
      expect(result.valid_sessions).toHaveLength(0);
      expect(result.total_minutes).toBe(0);
    });

    it('should return current_session open when session elapsed <= 8h', async () => {
      const clockedIn = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // valid sessions
        .mockResolvedValueOnce({
          rows: [makeEntry({ clocked_in_at: clockedIn })],
          rowCount: 1,
        }); // open session

      const result = await service.getSummary('user-1', 'consultor', 'user-1');

      expect(result.current_session.status).toBe('open');
      if (result.current_session.status === 'open') {
        expect(result.current_session.elapsed_minutes).toBeGreaterThan(100);
        expect(result.current_session.elapsed_minutes).toBeLessThan(130);
      }
    });

    it('should return current_session invalid when session elapsed > 8h', async () => {
      const clockedIn = new Date(Date.now() - 9 * 60 * 60 * 1000); // 9h ago
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // valid sessions
        .mockResolvedValueOnce({
          rows: [makeEntry({ clocked_in_at: clockedIn })],
          rowCount: 1,
        }); // open session

      const result = await service.getSummary('user-1', 'consultor', 'user-1');

      expect(result.current_session.status).toBe('invalid');
      if (result.current_session.status === 'invalid') {
        expect(result.current_session.reason).toBe('exceeded_max_duration');
      }
    });

    it('should sum total_minutes from valid sessions', async () => {
      const now = new Date();
      const sessions = [
        {
          id: 'a',
          clocked_in_at: new Date(now.getTime() - 4 * 3600000),
          clocked_out_at: now,
          duration_seconds: 4 * 3600,
        },
        {
          id: 'b',
          clocked_in_at: new Date(now.getTime() - 8 * 3600000),
          clocked_out_at: new Date(now.getTime() - 4 * 3600000),
          duration_seconds: 4 * 3600,
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: sessions, rowCount: 2 }) // valid sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // open session

      const result = await service.getSummary('user-1', 'consultor', 'user-1');

      expect(result.total_minutes).toBe(480);
      expect(result.valid_sessions).toHaveLength(2);
    });

    it('should throw ForbiddenException when non-superuser requests another user summary', async () => {
      await expect(
        service.getSummary('requester-id', 'consultor', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow superuser to request another user summary', async () => {
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getSummary(
        'superuser-id',
        'assessor',
        'other-user-id',
      );

      expect(result).toHaveProperty('current_session');
    });
  });
});
