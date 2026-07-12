import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as assetsService from './assets.service';
import { db } from '../../db';
import { AppError } from '../../lib/errors';

vi.mock('../../db', () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
  };
});

describe('Assets Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list categories', async () => {
    const mockFrom = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Laptops' }]);
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const categories = await assetsService.listCategories();
    expect(categories).toEqual([{ id: 'c1', name: 'Laptops' }]);
    expect(db.select).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
  });

  it('should create a category', async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'c1', name: 'Laptops', description: 'Office laptops' }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const category = await assetsService.createCategory({ name: 'Laptops', description: 'Office laptops' });
    expect(category).toEqual({ id: 'c1', name: 'Laptops', description: 'Office laptops' });
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({ name: 'Laptops', description: 'Office laptops' });
  });

  it('should list assets', async () => {
    const mockLeftJoin = vi.fn().mockResolvedValue([
      {
        id: 'a1',
        categoryId: 'c1',
        categoryName: 'Laptops',
        name: 'MacBook Pro',
        serialNumber: 'SN123',
        state: 'available',
      },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const assets = await assetsService.listAssets();
    expect(assets).toEqual([
      {
        id: 'a1',
        categoryId: 'c1',
        categoryName: 'Laptops',
        name: 'MacBook Pro',
        serialNumber: 'SN123',
        state: 'available',
      },
    ]);
  });

  it('should create an asset and verify default state is available', async () => {
    const mockReturning = vi.fn().mockResolvedValue([
      {
        id: 'a1',
        name: 'MacBook Pro',
        categoryId: 'c1',
        serialNumber: 'SN123',
        state: 'available',
      },
    ]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const asset = await assetsService.createAsset({ name: 'MacBook Pro', categoryId: 'c1', serialNumber: 'SN123' });
    expect(asset.state).toBe('available');
    expect(db.insert).toHaveBeenCalled();
  });

  describe('transitionState', () => {
    it('should allow valid transitions (available -> allocated)', async () => {
      // 1. Mock asset fetch
      const mockWhereSelect = vi.fn().mockResolvedValue([{ id: 'a1', state: 'available' }]);
      const mockFromSelect = vi.fn().mockReturnValue({ where: mockWhereSelect });
      vi.mocked(db.select).mockReturnValue({ from: mockFromSelect } as any);

      // 2. Mock asset update
      const mockReturningUpdate = vi.fn().mockResolvedValue([{ id: 'a1', state: 'allocated' }]);
      const mockWhereUpdate = vi.fn().mockReturnValue({ returning: mockReturningUpdate });
      const mockSetUpdate = vi.fn().mockReturnValue({ where: mockWhereUpdate });
      vi.mocked(db.update).mockReturnValue({ set: mockSetUpdate } as any);

      const result = await assetsService.transitionState('a1', 'allocated');
      expect(result.state).toBe('allocated');
    });

    it('should throw AppError(422) for invalid transitions (available -> lost)', async () => {
      // 1. Mock asset fetch
      const mockWhereSelect = vi.fn().mockResolvedValue([{ id: 'a1', state: 'available' }]);
      const mockFromSelect = vi.fn().mockReturnValue({ where: mockWhereSelect });
      vi.mocked(db.select).mockReturnValue({ from: mockFromSelect } as any);

      await expect(assetsService.transitionState('a1', 'lost')).rejects.toThrow(
        new AppError(422, 'Invalid transition from available to lost')
      );
    });

    it('should throw AppError(404) if asset not found', async () => {
      const mockWhereSelect = vi.fn().mockResolvedValue([]);
      const mockFromSelect = vi.fn().mockReturnValue({ where: mockWhereSelect });
      vi.mocked(db.select).mockReturnValue({ from: mockFromSelect } as any);

      await expect(assetsService.transitionState('a1', 'allocated')).rejects.toThrow(
        new AppError(404, 'Asset not found')
      );
    });

    it('should catch database trigger error 22000 and rethrow as AppError(422)', async () => {
      // 1. Mock asset fetch
      const mockWhereSelect = vi.fn().mockResolvedValue([{ id: 'a1', state: 'available' }]);
      const mockFromSelect = vi.fn().mockReturnValue({ where: mockWhereSelect });
      vi.mocked(db.select).mockReturnValue({ from: mockFromSelect } as any);

      // 2. Mock update to throw database error code 22000
      const mockError = { code: '22000', message: 'DB trigger: Invalid state transition' };
      const mockSetUpdate = vi.fn().mockImplementation(() => {
        throw mockError;
      });
      vi.mocked(db.update).mockReturnValue({ set: mockSetUpdate } as any);

      await expect(assetsService.transitionState('a1', 'allocated')).rejects.toThrow(
        new AppError(422, 'DB trigger: Invalid state transition')
      );
    });
  });
});
