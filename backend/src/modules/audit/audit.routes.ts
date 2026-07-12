import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { AppError } from '../../lib/errors';
import * as auditService from './audit.service';

const router = Router();

router.get('/cycles', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await auditService.listCycles();
    res.status(200).json(cycles);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/cycles',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, startDate, endDate, status } = req.body;
      if (!name || !startDate || !endDate) {
        return next(new AppError(400, 'name, startDate, and endDate are required'));
      }

      const cycle = await auditService.createCycle(
        { name, startDate, endDate, status },
        req.user!.id
      );
      res.status(201).json(cycle);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/cycles/:id/assignments',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { auditorEmployeeId } = req.body;
      if (!auditorEmployeeId) {
        return next(new AppError(400, 'auditorEmployeeId is required'));
      }

      const assignment = await auditService.addAssignment(req.params.id, auditorEmployeeId);
      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/cycles/:id/findings',
  authenticate,
  requireRole('auditor', 'admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const findings = await auditService.listFindings(req.params.id);
      res.status(200).json(findings);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/cycles/:id/discrepancy-report',
  authenticate,
  requireRole('auditor', 'admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await auditService.getDiscrepancyReport(req.params.id);
      res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/findings',
  authenticate,
  requireRole('auditor', 'admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { auditCycleId, assetId, expectedState, observedState, notes } = req.body;
      if (!auditCycleId || !assetId || !expectedState || !observedState) {
        return next(
          new AppError(400, 'auditCycleId, assetId, expectedState, and observedState are required')
        );
      }

      const finding = await auditService.createFinding(
        { auditCycleId, assetId, expectedState, observedState, notes },
        req.user!.id
      );
      res.status(201).json(finding);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
