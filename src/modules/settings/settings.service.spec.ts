import { Test } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { DatabaseService } from '../../database/database.service';

const DEFAULT_SETTINGS = { min_week_hours: 40 };

describe('SettingsService', () => {
  let service: SettingsService;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: DatabaseService,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    db = moduleRef.get(DatabaseService);
    (db.query as jest.Mock).mockResolvedValueOnce({
      rows: [DEFAULT_SETTINGS],
    });

    await moduleRef.init();
    service = moduleRef.get(SettingsService);
  });

  describe('getAll', () => {
    it('should return all settings from cache', () => {
      expect(service.getAll()).toEqual({ min_week_hours: 40 });
    });

    it('should return a copy, not the cache reference', () => {
      const a = service.getAll();
      const b = service.getAll();
      expect(a).not.toBe(b);
    });
  });

  describe('get', () => {
    it('should return a specific setting value from cache', () => {
      expect(service.get('min_week_hours')).toBe(40);
    });

    it('should not hit the database when reading from cache', () => {
      service.get('min_week_hours');
      expect(db.query).toHaveBeenCalledTimes(1); // only the onModuleInit call
    });
  });

  describe('update', () => {
    it('should persist to the database and return updated settings', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await service.update({ min_week_hours: 35 });

      expect(result).toEqual({ min_week_hours: 35 });
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should update cache so subsequent get() returns the new value immediately', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.update({ min_week_hours: 35 });

      expect(service.get('min_week_hours')).toBe(35);
    });

    it('should not hit the database when reading cache after update', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await service.update({ min_week_hours: 35 });
      service.get('min_week_hours');

      expect(db.query).toHaveBeenCalledTimes(2); // init + update, no extra for get()
    });
  });
});
