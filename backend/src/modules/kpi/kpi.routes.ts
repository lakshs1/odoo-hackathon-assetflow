import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { AppError } from '../../lib/errors';
import * as kpiService from './kpi.service';

const router = Router();

router.use(authenticate, requireRole('admin', 'manager', 'auditor', 'super_admin'));

router.get(
  '/asset-utilization',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await kpiService.assetUtilization();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/overdue-allocations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await kpiService.overdueAllocations();
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/maintenance-activity',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = typeof req.query.start === 'string' ? req.query.start : undefined;
      const end = typeof req.query.end === 'string' ? req.query.end : undefined;
      const data = await kpiService.maintenanceActivity(start, end);
      res.status(200).json(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid date range') {
        return next(new AppError(400, error.message));
      }
      next(error);
    }
  }
);

export default router;
