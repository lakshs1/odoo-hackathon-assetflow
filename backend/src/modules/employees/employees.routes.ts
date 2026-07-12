import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as employeesService from './employees.service';
import { AppError } from '../../lib/errors';

const router = Router();

router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await employeesService.list();
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, departmentId, fullName, employeeCode } = req.body;
      if (!userId || !departmentId || !fullName || !employeeCode) {
        return next(new AppError(400, 'Bad Request: missing required employee fields'));
      }
      const newEmployee = await employeesService.create({
        userId,
        departmentId,
        fullName,
        employeeCode,
      });
      res.status(201).json(newEmployee);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { departmentId, fullName, employeeCode } = req.body;
      const updatedEmployee = await employeesService.update(id, {
        departmentId,
        fullName,
        employeeCode,
      });
      res.status(200).json(updatedEmployee);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
