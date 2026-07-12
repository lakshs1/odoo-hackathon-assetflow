import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { assignRole, UserRole } from './auth.service';
import { supabaseAdmin } from '../../lib/supabase';
import { db } from '../../db';
import { AppError } from '../../lib/errors';

// Mock Supabase Client
vi.mock('../../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      admin: {
        updateUserById: vi.fn(),
      },
    },
  },
}));

// Mock Database Connection
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(true),
      })),
    })),
  },
}));

describe('Auth & RBAC Module Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate middleware', () => {
    it('should throw 401 if authorization header is missing', async () => {
      const req = { headers: {} } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as any).mock.calls[0][0];
      expect(error.status).toBe(401);
      expect(error.message).toContain('missing or invalid authorization header');
    });

    it('should throw 401 if header does not start with Bearer', async () => {
      const req = { headers: { authorization: 'Basic token123' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next as any).mock.calls[0][0].status).toBe(401);
    });

    it('should throw 401 if token validation fails', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', status: 401 } as any,
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next as any).mock.calls[0][0].status).toBe(401);
      expect((next as any).mock.calls[0][0].message).toContain('invalid or expired token');
    });

    it('should attach req.user with role employee if role is not present in app_metadata', async () => {
      const req = { headers: { authorization: 'Bearer valid-token' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'user-uuid',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: '',
          } as any,
        },
        error: null,
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: 'user-uuid', role: 'employee' });
    });

    it('should attach req.user with correct role from app_metadata', async () => {
      const req = { headers: { authorization: 'Bearer valid-token' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'admin-uuid',
            app_metadata: { role: 'admin' },
            user_metadata: {},
            aud: 'authenticated',
            created_at: '',
          } as any,
        },
        error: null,
      });

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: 'admin-uuid', role: 'admin' });
    });
  });

  describe('requireRole middleware', () => {
    it('should call next() if req.user.role is in allowed list', () => {
      const req = { user: { id: 'u1', role: 'manager' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('manager', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should throw 403 if req.user.role is not in allowed list', () => {
      const req = { user: { id: 'u1', role: 'employee' } } as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = requireRole('manager', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next as any).mock.calls[0][0].status).toBe(403);
    });
  });

  describe('assignRole service', () => {
    it('should allow valid assignments based on the matrix', async () => {
      vi.spyOn(supabaseAdmin.auth.admin, 'updateUserById').mockResolvedValue({
        data: { user: {} as any },
        error: null,
      });

      await expect(
        assignRole('admin-id', 'admin', 'target-user-id', 'manager')
      ).resolves.not.toThrow();

      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        'target-user-id',
        { app_metadata: { role: 'manager' } }
      );
    });

    it('should deny unauthorized assignments', async () => {
      await expect(
        assignRole('manager-id', 'manager', 'target-user-id', 'admin')
      ).rejects.toThrow(expect.any(AppError));

      try {
        await assignRole('manager-id', 'manager', 'target-user-id', 'admin');
      } catch (err: any) {
        expect(err.status).toBe(403);
        expect(err.message).toContain('Unauthorized role assignment');
      }
    });
  });
});
