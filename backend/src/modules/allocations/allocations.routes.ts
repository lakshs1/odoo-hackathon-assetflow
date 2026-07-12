import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { AppError } from '../../lib/errors';
import * as allocationsService from './allocations.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await allocationsService.listAllocations(req.user!.id, req.user!.role);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  authenticate,
  requireRole('admin', 'manager', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assetId, allocatedToEmployeeId, allocatedToDepartmentId } = req.body;
      if (!assetId) {
        return next(new AppError(400, 'assetId is required'));
      }

      const allocation = await allocationsService.createAllocation(
        {
          assetId,
          allocatedToEmployeeId,
          allocatedToDepartmentId,
        },
        req.user!.id
      );

      res.status(201).json(allocation);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/return',
  authenticate,
  requireRole('admin', 'manager', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allocation = await allocationsService.returnAllocation(req.params.id);
      res.status(200).json(allocation);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
