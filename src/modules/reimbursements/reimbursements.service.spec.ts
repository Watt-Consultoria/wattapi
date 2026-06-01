import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReimbursementsService } from './reimbursements.service';
import { DatabaseService } from '../../database/database.service';
import type { UserResponse } from '../users/users.service';

const makeCaller = (overrides: Partial<UserResponse> = {}): UserResponse => ({
  id: 'caller-uuid',
  email: 'caller@test.com',
  name: 'Caller',
  role: 'consultor',
  sector: 'projetos',
  cpf: '12345678901',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeReimbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'reimb-uuid-1',
  user_id: 'caller-uuid',
  title: 'Test Reimbursement',
  description: 'Test description',
  amount_cents: 5000,
  category: 'transporte',
  pix_key: 'key@pix.com',
  status: 'pending',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const makeJoinRow = (overrides: Record<string, unknown> = {}) => ({
  ...makeReimbRow(),
  att_id: null as string | null,
  att_path: null as string | null,
  att_name: null as string | null,
  att_created_at: null as Date | null,
  ...overrides,
});

const makeAttRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'att-uuid-1',
  reimbursement_id: 'reimb-uuid-1',
  path: 'receipts/caller-uuid/uuid/file.pdf',
  name: 'receipt.pdf',
  created_at: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('ReimbursementsService', () => {
  let service: ReimbursementsService;
  let db: {
    query: jest.Mock;
    withTransaction: jest.Mock;
    client: { storage: { from: jest.Mock } };
  };
  let mockCreateSignedUrl: jest.Mock;
  let mockList: jest.Mock;

  beforeEach(async () => {
    mockCreateSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://signed.url/file.pdf' },
      error: null,
    });
    mockList = jest.fn().mockResolvedValue({
      data: [{ name: 'file.pdf' }],
      error: null,
    });

    const module = await Test.createTestingModule({
      providers: [
        ReimbursementsService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            withTransaction: jest.fn(),
            client: {
              storage: {
                from: jest.fn().mockReturnValue({
                  createSignedUrl: mockCreateSignedUrl,
                  list: mockList,
                }),
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get(ReimbursementsService);
    db = module.get(DatabaseService) as typeof db;
  });

  describe('create', () => {
    it('should return created reimbursement with attachments', async () => {
      const reimbRow = makeReimbRow();
      const attRow = makeAttRow();
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [reimbRow], rowCount: 1 })
          .mockResolvedValueOnce({ rows: [attRow], rowCount: 1 }),
      };
      db.withTransaction.mockImplementation(
        (fn: (client: typeof mockClient) => Promise<unknown>) => fn(mockClient),
      );

      const result = await service.create('caller-uuid', {
        title: 'Test Reimbursement',
        description: 'Test description',
        amount_cents: 5000,
        category: 'transporte',
        pix_key: 'key@pix.com',
        attachments: [
          { path: 'receipts/caller-uuid/uuid/file.pdf', name: 'receipt.pdf' },
        ],
      });

      expect(result.id).toBe('reimb-uuid-1');
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].signed_url).toBe(
        'https://signed.url/file.pdf',
      );
    });

    it('should throw BadRequestException when attachment path not found in storage', async () => {
      mockList.mockResolvedValueOnce({ data: [], error: null });

      await expect(
        service.create('caller-uuid', {
          title: 'Test Reimbursement',
          description: 'Test description',
          amount_cents: 5000,
          category: 'transporte',
          pix_key: 'key@pix.com',
          attachments: [
            {
              path: 'receipts/caller-uuid/uuid/missing.pdf',
              name: 'missing.pdf',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return only caller reimbursements when target=me', async () => {
      db.query.mockResolvedValueOnce({
        rows: [makeJoinRow()],
        rowCount: 1,
      });

      const result = await service.findAll(makeCaller(), 'me');

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe('caller-uuid');
    });

    it('should return all reimbursements when target=all and caller is superuser', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          makeJoinRow(),
          makeJoinRow({ id: 'reimb-uuid-2', user_id: 'other-user' }),
        ],
        rowCount: 2,
      });

      const result = await service.findAll(
        makeCaller({ role: 'assessor' }),
        'all',
      );

      expect(result).toHaveLength(2);
    });

    it('should throw ForbiddenException when target=all and caller is not superuser', async () => {
      await expect(
        service.findAll(makeCaller({ role: 'consultor' }), 'all'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByUser', () => {
    it('should return reimbursements for given user_id when caller is superuser', async () => {
      db.query.mockResolvedValueOnce({
        rows: [makeJoinRow({ user_id: 'target-user' })],
        rowCount: 1,
      });

      const result = await service.findByUser(
        makeCaller({ role: 'assessor' }),
        'target-user',
      );

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException when caller is not superuser', async () => {
      await expect(
        service.findByUser(makeCaller({ role: 'consultor' }), 'target-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update status from pending to approved', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [makeReimbRow({ status: 'pending' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [makeReimbRow({ status: 'approved' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.updateStatus('reimb-uuid-1', {
        status: 'approved',
      });

      expect(result.status).toBe('approved');
    });

    it('should update status from pending to rejected', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [makeReimbRow({ status: 'pending' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [makeReimbRow({ status: 'rejected' })],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.updateStatus('reimb-uuid-1', {
        status: 'rejected',
      });

      expect(result.status).toBe('rejected');
    });

    it('should throw BadRequestException when reimbursement is already resolved', async () => {
      db.query.mockResolvedValueOnce({
        rows: [makeReimbRow({ status: 'approved' })],
        rowCount: 1,
      });

      await expect(
        service.updateStatus('reimb-uuid-1', { status: 'rejected' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when reimbursement does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.updateStatus('nonexistent-id', { status: 'approved' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
