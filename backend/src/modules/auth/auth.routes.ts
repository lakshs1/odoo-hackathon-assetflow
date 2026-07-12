import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { assignRole, UserRole } from './auth.service';
import { AppError } from '../../lib/errors';

const router = Router();

router.post(
  '/assign-role',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetUserId, role } = req.body;

      if (!targetUserId || typeof targetUserId !== 'string') {
        return next(new AppError(400, 'Bad Request: targetUserId is required and must be a string'));
      }

      const validRoles: UserRole[] = ['super_admin', 'admin', 'manager', 'auditor', 'employee'];
      if (!role || !validRoles.includes(role as UserRole)) {
        return next(new AppError(400, 'Bad Request: role is required and must be a valid UserRole'));
      }

      const requesterId = req.user!.id;
      const requesterRole = req.user!.role as UserRole;

      await assignRole(requesterId, requesterRole, targetUserId, role as UserRole);

      res.status(200).json({ message: 'Role assigned successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
