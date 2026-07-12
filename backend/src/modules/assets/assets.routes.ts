import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as assetsService from './assets.service';
import { AppError } from '../../lib/errors';

const router = Router();

router.get(
  '/asset-categories',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await assetsService.listCategories();
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/asset-categories',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return next(new AppError(400, 'Bad Request: name is required'));
      }
      const newCategory = await assetsService.createCategory({ name, description });
      res.status(201).json(newCategory);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/assets',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await assetsService.listAssets();
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/assets',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, categoryId, serialNumber } = req.body;
      if (!name || !categoryId || !serialNumber) {
        return next(new AppError(400, 'Bad Request: missing required asset fields'));
      }
      const newAsset = await assetsService.createAsset({ name, categoryId, serialNumber });
      res.status(201).json(newAsset);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/assets/:id/state',
  authenticate,
  requireRole('admin', 'super_admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { state } = req.body;
      if (!state) {
        return next(new AppError(400, 'Bad Request: state is required'));
      }
      const updatedAsset = await assetsService.transitionState(id, state, req.user?.role);
      res.status(200).json(updatedAsset);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
