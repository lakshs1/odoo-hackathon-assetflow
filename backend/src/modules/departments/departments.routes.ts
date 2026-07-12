import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as departmentsService from './departments.service';
import { AppError } from '../../lib/errors';

const router = Router();

router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await departmentsService.list();
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
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return next(new AppError(400, 'Bad Request: name is required and must be a string'));
      }
      const newDept = await departmentsService.create(name);
      res.status(201).json(newDept);
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
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return next(new AppError(400, 'Bad Request: name is required and must be a string'));
      }
      const updatedDept = await departmentsService.update(id, name);
      res.status(200).json(updatedDept);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const deletedDept = await departmentsService.remove(id);
      res.status(200).json(deletedDept);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
