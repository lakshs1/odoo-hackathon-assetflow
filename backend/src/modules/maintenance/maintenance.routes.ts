import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { AppError } from '../../lib/errors';
import * as maintenanceService from './maintenance.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await maintenanceService.listMaintenanceRequests(req.user!.id, req.user!.role);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, notes } = req.body;
    if (!assetId) {
      return next(new AppError(400, 'assetId is required'));
    }

    const request = await maintenanceService.createMaintenanceRequest(
      { assetId, notes },
      req.user!.id
    );
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id/state',
  authenticate,
  requireRole('manager', 'admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { state } = req.body;
      if (!state) {
        return next(new AppError(400, 'state is required'));
      }

      const request = await maintenanceService.transitionMaintenanceRequest(
        req.params.id,
        state,
        req.user!.role,
        req.user!.id
      );
      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
