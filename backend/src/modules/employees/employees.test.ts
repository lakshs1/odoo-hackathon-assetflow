import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as employeesService from './employees.service';
import { db } from '../../db';
import { AppError } from '../../lib/errors';

// Mock DB
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn().mockResolvedValue([
          {
            id: 'e1',
            userId: 'u1',
            departmentId: 'd1',
            departmentName: 'Engineering',
            fullName: 'Alice Smith',
            employeeCode: 'EMP001',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'e2',
            userId: 'u2',
            departmentId: 'd1',
            fullName: 'Bob Jones',
            employeeCode: 'EMP002',
          },
        ]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'e1',
              fullName: 'Alice Johnson',
              updatedAt: new Date(Date.now() + 1000),
            },
          ]),
        })),
      })),
    })),
  },
}));

describe('Employees Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list employees with department name', async () => {
    const list = await employeesService.list();
    expect(list[0]).toHaveProperty('departmentName', 'Engineering');
    expect(list[0].fullName).toBe('Alice Smith');
  });

  it('should create an employee', async () => {
    const newEmp = await employeesService.create({
      userId: 'u2',
      departmentId: 'd1',
      fullName: 'Bob Jones',
      employeeCode: 'EMP002',
    });
    expect(newEmp.fullName).toBe('Bob Jones');
  });

  it('should update an employee and set updatedAt', async () => {
    const updated = await employeesService.update('e1', {
      fullName: 'Alice Johnson',
    });
    expect(updated.fullName).toBe('Alice Johnson');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(Date.now() - 10000);
  });
});
