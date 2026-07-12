import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as departmentsService from './departments.service';
import { db } from '../../db';
import { AppError } from '../../lib/errors';

// Mock DB
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Engineering' }]),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'd2', name: 'HR' }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Product' }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Engineering' }]),
      })),
    })),
  },
}));

describe('Departments Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list departments', async () => {
    const list = await departmentsService.list();
    expect(list).toEqual([{ id: 'd1', name: 'Engineering' }]);
  });

  it('should create a department', async () => {
    const newDept = await departmentsService.create('HR');
    expect(newDept).toEqual({ id: 'd2', name: 'HR' });
  });

  it('should throw bad request error if department name is missing in create', async () => {
    await expect(departmentsService.create('')).rejects.toThrow(expect.any(AppError));
  });

  it('should update a department name', async () => {
    const updated = await departmentsService.update('d1', 'Product');
    expect(updated).toEqual({ id: 'd1', name: 'Product' });
  });

  it('should delete a department', async () => {
    const deleted = await departmentsService.remove('d1');
    expect(deleted).toEqual({ id: 'd1', name: 'Engineering' });
  });

  it('should throw 409 error if deleting a department with foreign key constraint violation (has employees)', async () => {
    vi.spyOn(db, 'delete').mockImplementation(() => {
      throw { code: '23503', message: 'Foreign key violation' } as any;
    });

    await expect(departmentsService.remove('d1')).rejects.toThrow(expect.any(AppError));
    try {
      await departmentsService.remove('d1');
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.message).toBe('Cannot delete department with employees');
    }
  });
});
